package com.pixtech.pos

import android.content.Intent
import android.os.Bundle
import com.getcapacitor.BridgeActivity
import com.pixtech.pos.plugins.TrackerPlugin

/**
 * MainActivity — Capacitor WebView host.
 *
 * On first launch, redirects to PermissionActivity to enforce required permissions.
 * Once all permissions are granted, the Capacitor WebView loads the POS web app.
 */
class MainActivity : BridgeActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        // Register custom native plugins BEFORE super.onCreate()
        registerPlugin(TrackerPlugin::class.java)

        super.onCreate(savedInstanceState)

        // Check permissions on every launch — if missing, go to PermissionActivity
        if (!PermissionActivity.allGranted(this)) {
            startActivity(Intent(this, PermissionActivity::class.java))
            finish()
            return
        }
    }
}
