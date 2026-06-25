package com.pixtech.pos

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * BootReceiver — restarts the LocationWorker after device reboot.
 * Declared in AndroidManifest.xml with RECEIVE_BOOT_COMPLETED permission.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            Log.d("BootReceiver", "Device booted — checking if location tracker should restart")
            // Re-schedule location worker if user was logged in before boot
            val prefs = context.getSharedPreferences("pixtech_prefs", Context.MODE_PRIVATE)
            val userId   = prefs.getString("logged_user_id",   null)
            val userName = prefs.getString("logged_user_name", null)
            if (userId != null && userName != null) {
                Log.d("BootReceiver", "Restarting location tracker for $userName")
                LocationWorker.schedule(context, userId, userName)
            }
        }
    }
}
