// app/api/admin/create-employee/route.ts
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify the caller is an admin
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: callerData } = await supabaseAuth
      .from('employees')
      .select('role, status')
      .eq('auth_id', user.id)
      .limit(1)
      .single();

    if (!callerData || callerData.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // 2. Parse body
    const body = await request.json();
    const { email, password, full_name, sector_id, role, commission_rate } = body;

    if (!email || !password || !full_name || !sector_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 3. Use service role to create the auth user
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !newUser.user) {
      return NextResponse.json(
        { error: authError?.message || 'Failed to create user' },
        { status: 400 }
      );
    }

    // 4. Create the employee record
    const { error: empError } = await supabaseAdmin
      .from('employees')
      .insert({
        auth_id: newUser.user.id,
        email,
        full_name,
        sector_id,
        role: role || 'employee',
        commission_rate: commission_rate || 0,
        status: 'approved',
      });

    if (empError) {
      // Roll back the auth user if employee insert fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json({ error: empError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, user_id: newUser.user.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}