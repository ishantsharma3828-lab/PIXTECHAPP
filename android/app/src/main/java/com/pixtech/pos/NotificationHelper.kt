package com.pixtech.pos

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * NotificationHelper
 * ──────────────────────────────────────────────────────────────────────────────
 * Sends local push notifications for admin calendar event broadcasts.
 * Creates the required notification channel on first call.
 */
object NotificationHelper {

    private const val CHANNEL_ID   = "pixtech_tracker_channel"
    private const val CHANNEL_NAME = "PIX TECH Announcements"

    fun sendBroadcastNotification(context: Context, title: String, body: String) {
        createChannel(context)

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)

        try {
            NotificationManagerCompat.from(context)
                .notify(System.currentTimeMillis().toInt(), builder.build())
        } catch (e: SecurityException) {
            // Notification permission not yet granted — will be requested by PermissionActivity
        }
    }

    fun sendAutoCheckInNotification(context: Context, userName: String, type: String) {
        createChannel(context)
        val title = if (type == "check_in") "✅ Auto Check-In" else "👋 Auto Check-Out"
        val body  = "$userName was automatically ${if (type == "check_in") "checked in" else "checked out"} based on location."

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)

        try {
            NotificationManagerCompat.from(context)
                .notify(System.currentTimeMillis().toInt(), builder.build())
        } catch (e: SecurityException) {
            // ignore
        }
    }

    private fun createChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH,
            ).apply {
                description = "Admin announcements and attendance alerts"
                enableLights(true)
                enableVibration(true)
            }
            val nm = context.getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }
    }
}
