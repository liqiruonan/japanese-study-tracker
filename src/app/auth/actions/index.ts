'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const username = formData.get('username') as string

  // We use the admin client with the service_role key to bypass all email confirmation
  // and rate limiting restrictions imposed by the free tier of Supabase.
  const adminAuthClient = createAdminClient().auth.admin

  const { data: userData, error: createError } = await adminAuthClient.createUser({
    email,
    password,
    email_confirm: true, // This is the magic bullet: bypasses email verification entirely!
    user_metadata: {
      username: username
    }
  })

  if (createError) {
    redirect(`/signup?error=${encodeURIComponent(createError.message)}`)
  }

  // Now that the user is created and confirmed, we just log them in normally
  // so their session cookie is set in the browser.
  const supabase = await createClient()
  const { error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (loginError) {
    // Edge case: created but failed to log in automatically
    redirect(`/login?error=${encodeURIComponent("Account created, but couldn't auto-login. Please log in manually.")}`)
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
