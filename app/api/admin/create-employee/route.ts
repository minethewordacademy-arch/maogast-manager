// app/api/admin/create-employee/route.ts
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify the caller is an approved admin
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

    if (!callerData || callerData.role !== 'admin' || callerData.status !== 'approved') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // 2. Parse body
    const body = await request.json();
    const { email, password, full_name, sector_ids, role, commission_rate } = body;

    // Accept both sector_ids (array) and sector_id (legacy single)
    const sectorsArray: string[] = Array.isArray(sector_ids)
      ? sector_ids
      : body.sector_id
      ? [body.sector_id]
      : [];

    if (!email || !password || !full_name || sectorsArray.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields (email, password, full_name, sector_ids)' },
        { status: 400 }
      );
    }

    // 3. Service role client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 4. Create auth user
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

    // 5. Insert employee with BOTH sector_id (primary) and sector_ids (full array)
    const { error: empError } = await supabaseAdmin
      .from('employees')
      .insert({
        auth_id: newUser.user.id,
        email,
        full_name,
        sector_id: sectorsArray[0],       // primary (first selected)
        sector_ids: sectorsArray,          // full array
        role: role || 'employee',
        commission_rate: commission_rate || 0,
        status: 'approved',
      });

    if (empError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json({ error: empError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, user_id: newUser.user.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}