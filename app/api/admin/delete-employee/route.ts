// app/api/admin/delete-employee/route.ts
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
    const { employee_id, auth_id } = body;

    if (!employee_id || !auth_id) {
      return NextResponse.json(
        { error: 'Missing employee_id or auth_id' },
        { status: 400 }
      );
    }

    // 3. Prevent self-deletion
    if (auth_id === user.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account from here. Ask another admin.' },
        { status: 400 }
      );
    }

    // 4. Service role client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 5. Delete the auth user FIRST
    //    (so they can't log in even if the employee row deletion fails)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(auth_id);

    if (authDeleteError) {
      console.error('[delete-employee] Auth delete failed:', authDeleteError);
      // If the auth user doesn't exist, continue (might be orphaned record)
      if (!authDeleteError.message.toLowerCase().includes('not found')) {
        return NextResponse.json(
          { error: `Failed to delete auth user: ${authDeleteError.message}` },
          { status: 400 }
        );
      }
    }

    // 6. Delete the employee record
    const { error: empDeleteError } = await supabaseAdmin
      .from('employees')
      .delete()
      .eq('id', employee_id);

    if (empDeleteError) {
      console.error('[delete-employee] Employee row delete failed:', empDeleteError);
      return NextResponse.json(
        { error: `Auth user removed, but failed to remove employee record: ${empDeleteError.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    console.error('[delete-employee] Fatal:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}