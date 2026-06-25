package com.pixtech.pos

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.pixtech.pos.databinding.ActivityPermissionBinding

/**
 * PermissionActivity
 * ──────────────────────────────────────────────────────────────────────────────
 * Full-screen onboarding that forces the user to grant ALL required permissions
 * before they can enter the app. Shown once on first install; skipped on
 * subsequent launches once all permissions are permanently granted.
 *
 * Required permissions:
 *  - CAMERA
 *  - ACCESS_FINE_LOCATION
 *  - ACCESS_BACKGROUND_LOCATION  (Always – not just "while using the app")
 *  - POST_NOTIFICATIONS           (Android 13+)
 *
 * Flow:
 *   1. Check which permissions are missing.
 *   2. Show branded card explaining WHY the permission is needed.
 *   3. Trigger system dialog. If user denies → show rationale again → re-prompt.
 *   4. Once ALL granted → launch MainActivity and finish().
 */
class PermissionActivity : AppCompatActivity() {

    companion object {
        // Request codes
        private const val REQ_CAMERA       = 100
        private const val REQ_LOCATION     = 101
        private const val REQ_BG_LOCATION  = 102
        private const val REQ_NOTIFICATION = 103

        // SharedPrefs key
        private const val PREFS_NAME = "pixtech_prefs"
        private const val KEY_PERMS_DONE = "permissions_granted"

        /** Returns true if all required permissions are already granted. */
        fun allGranted(activity: AppCompatActivity): Boolean {
            val base = listOf(
                Manifest.permission.CAMERA,
                Manifest.permission.ACCESS_FINE_LOCATION,
            )
            val baseMissing = base.any {
                ContextCompat.checkSelfPermission(activity, it) != PackageManager.PERMISSION_GRANTED
            }
            if (baseMissing) return false

            // Background location check
            val bgMissing = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContextCompat.checkSelfPermission(
                    activity, Manifest.permission.ACCESS_BACKGROUND_LOCATION
                ) != PackageManager.PERMISSION_GRANTED
            } else false
            if (bgMissing) return false

            // Notification check (Android 13+)
            val notifMissing = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                ContextCompat.checkSelfPermission(
                    activity, Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            } else false

            return !notifMissing
        }
    }

    // Which step we're on (0=camera, 1=location, 2=bg_location, 3=notification)
    private var currentStep = 0

    private val permissionSteps = buildList {
        add(PermissionStep(
            icon = "📷",
            title = "Camera Access",
            description = "PIX TECH needs your camera to scan product barcodes and log missing stock directly from the shop floor.",
            permission = Manifest.permission.CAMERA,
            requestCode = REQ_CAMERA,
        ))
        add(PermissionStep(
            icon = "📍",
            title = "Location Access",
            description = "Your GPS location is used to automatically record when you arrive at or leave the store — no manual check-in needed.",
            permission = Manifest.permission.ACCESS_FINE_LOCATION,
            requestCode = REQ_LOCATION,
        ))
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            add(PermissionStep(
                icon = "🗺️",
                title = "Background Location\n(Always Allow)",
                description = "Select 'Allow all the time' so the app can detect your arrival/departure even when you're not actively using the app. This powers automatic attendance tracking.",
                permission = Manifest.permission.ACCESS_BACKGROUND_LOCATION,
                requestCode = REQ_BG_LOCATION,
                requiresSettingsRedirect = true,
            ))
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            add(PermissionStep(
                icon = "🔔",
                title = "Push Notifications",
                description = "Receive real-time alerts from your manager — schedule changes, important announcements, and store events.",
                permission = Manifest.permission.POST_NOTIFICATIONS,
                requestCode = REQ_NOTIFICATION,
            ))
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // If all already granted, skip straight to main app
        if (allGranted(this)) {
            proceedToMain()
            return
        }

        // Use a simple layout — we build the UI programmatically to avoid XML dependency
        setContentView(createPermissionLayout())
        showStep(currentStep)
    }

    private fun showStep(step: Int) {
        if (step >= permissionSteps.size) {
            // All steps done
            if (allGranted(this)) {
                proceedToMain()
            } else {
                // Some still denied — open app settings
                openAppSettings()
            }
            return
        }
        val permStep = permissionSteps[step]
        updateUI(permStep)
    }

    private fun requestCurrentPermission() {
        val step = permissionSteps[currentStep]
        if (step.requiresSettingsRedirect) {
            // For background location on Android Q+, direct to settings
            openLocationSettings()
        } else {
            ActivityCompat.requestPermissions(this, arrayOf(step.permission), step.requestCode)
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        val granted = grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED
        if (granted) {
            currentStep++
            showStep(currentStep)
        } else {
            // Show rationale and re-prompt — user cannot skip
            updateUIForDenied()
        }
    }

    override fun onResume() {
        super.onResume()
        // When returning from settings, re-check
        if (currentStep < permissionSteps.size) {
            val step = permissionSteps[currentStep]
            val isGranted = ContextCompat.checkSelfPermission(
                this, step.permission
            ) == PackageManager.PERMISSION_GRANTED
            if (isGranted) {
                currentStep++
                showStep(currentStep)
            }
        }
    }

    private fun proceedToMain() {
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }

    private fun openLocationSettings() {
        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
            data = Uri.fromParts("package", packageName, null)
        }
        startActivity(intent)
    }

    private fun openAppSettings() {
        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
            data = Uri.fromParts("package", packageName, null)
        }
        startActivity(intent)
    }

    // ── UI helpers ────────────────────────────────────────────────────────────

    // These are placeholders — in a real project you'd use proper XML layouts.
    // For simplicity we reference layout IDs that you can create in res/layout/
    private fun createPermissionLayout(): android.view.View {
        // Return a simple FrameLayout; actual layout is in activity_permission.xml
        return android.widget.FrameLayout(this).apply { id = android.R.id.content }
    }

    private fun updateUI(step: PermissionStep) {
        // In a full project this updates TextView/Button in activity_permission.xml
        // For now this is a hook — the actual rendering happens in the XML layout
        title = "PIX TECH POS — Setup"
    }

    private fun updateUIForDenied() {
        // Show a "please allow" message and re-trigger request
        requestCurrentPermission()
    }
}

data class PermissionStep(
    val icon: String,
    val title: String,
    val description: String,
    val permission: String,
    val requestCode: Int,
    val requiresSettingsRedirect: Boolean = false,
)
