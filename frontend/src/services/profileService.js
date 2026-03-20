/**
 * Check if the current user has completed profile (user_settings).
 */

import { supabase } from './supabase'

/**
 * Returns whether the user has a profile (user_settings row).
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function hasUserProfile(userId) {
  if (!userId) return false
  const { data, error } = await supabase
    .from('user_settings')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  return !error && !!data
}

/**
 * Returns true if the user has admin role.
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function isAdminUser(userId) {
  if (!userId) return false
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  return !error && data?.role === 'admin'
}
