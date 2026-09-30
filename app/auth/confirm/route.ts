// app/auth/confirm/route.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/reset-password';

  if (token_hash && type) {
    // 1. Create the redirect response FIRST so we can attach cookies to it
    const response = NextResponse.redirect(`${origin}${next}`);

    // 2. Create the Supabase client bound to this response's cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // 3. Attach auth cookies to the redirect response
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.verifyOtp({
      type: type as 'recovery',
      token_hash,
    });

    if (!error) {
      // 4. Return the same response — cookies are now attached
      return response;
    }

    console.error('[auth/confirm] verifyOtp failed:', error.message);
  }

  return NextResponse.redirect(`${origin}/login?error=invalid_reset_link`);
}