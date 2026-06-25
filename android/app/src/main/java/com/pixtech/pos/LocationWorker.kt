package com.pixtech.pos

import android.content.Context
import android.location.Location
import android.util.Log
import androidx.work.*
import com.pixtech.pos.data.AppDatabase
import com.pixtech.pos.data.entities.Attendance
import com.pixtech.pos.data.entities.EmployeeLocation
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

/**
 * LocationWorker
 * ──────────────────────────────────────────────────────────────────────────────
 * WorkManager background worker that runs every 5 minutes to:
 *  1. Get the current device GPS location
 *  2. Compare against the store's registered location
 *  3. Auto-fire check-in if employee arrives at store (within radius)
 *  4. Auto-fire check-out if employee leaves the store
 *  5. Update the employee_location table (for admin live map)
 *
 * Input data (set by BootReceiver or app on login):
 *   - userId:   String — logged-in employee ID
 *   - userName: String — employee display name
 */
class LocationWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    companion object {
        const val TAG = "LocationWorker"
        const val KEY_USER_ID   = "userId"
        const val KEY_USER_NAME = "userName"

        /** Schedule the periodic background location check. */
        fun schedule(context: Context, userId: String, userName: String) {
            val constraints = Constraints.Builder()
                .setRequiresBatteryNotLow(false)
                .build()

            val data = workDataOf(
                KEY_USER_ID   to userId,
                KEY_USER_NAME to userName,
            )

            val request = PeriodicWorkRequestBuilder<LocationWorker>(5, TimeUnit.MINUTES)
                .setConstraints(constraints)
                .setInputData(data)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                "location_tracker_$userId",
                ExistingPeriodicWorkPolicy.KEEP,
                request,
            )
        }

        /** Cancel the worker for a given user (on logout). */
        fun cancel(context: Context, userId: String) {
            WorkManager.getInstance(context).cancelUniqueWork("location_tracker_$userId")
        }
    }

    override suspend fun doWork(): Result {
        val userId   = inputData.getString(KEY_USER_ID)   ?: return Result.failure()
        val userName = inputData.getString(KEY_USER_NAME) ?: "Employee"

        Log.d(TAG, "Running location check for $userName ($userId)")

        return withContext(Dispatchers.IO) {
            try {
                val db       = AppDatabase.getDatabase(applicationContext)
                val settings = db.trackerDao().getStoreSettings()

                // If store location not configured yet, skip
                if (settings == null || (settings.storeLat == 0.0 && settings.storeLng == 0.0)) {
                    Log.d(TAG, "Store location not configured, skipping")
                    return@withContext Result.success()
                }

                // Get current location using FusedLocationProviderClient
                val currentLocation = getCurrentLocation() ?: return@withContext Result.success()

                // Calculate distance to store
                val storeLocation = Location("store").apply {
                    latitude  = settings.storeLat
                    longitude = settings.storeLng
                }
                val distanceMeters = currentLocation.distanceTo(storeLocation)
                val isInStore = distanceMeters <= settings.radiusMeters

                Log.d(TAG, "Distance to store: ${distanceMeters}m, inStore=$isInStore")

                // Update employee location in DB (for admin map)
                db.trackerDao().upsertEmployeeLocation(
                    EmployeeLocation(
                        userId     = userId,
                        userName   = userName,
                        lat        = currentLocation.latitude,
                        lng        = currentLocation.longitude,
                        lastSeenMs = System.currentTimeMillis(),
                        isInStore  = isInStore,
                    )
                )

                // Check last attendance record to decide if we need to auto-fire
                val lastLog = db.trackerDao().getAttendanceForUser(userId).firstOrNull()
                val lastType = lastLog?.type

                val today = java.util.Calendar.getInstance().apply {
                    timeInMillis = System.currentTimeMillis()
                }
                val lastDay = lastLog?.let {
                    java.util.Calendar.getInstance().apply { timeInMillis = it.timestampMs }
                }

                val isNewDay = lastDay == null ||
                    today.get(java.util.Calendar.DAY_OF_YEAR) != lastDay.get(java.util.Calendar.DAY_OF_YEAR)

                if (isInStore && (lastType == "check_out" || isNewDay)) {
                    // Auto check-in
                    db.trackerDao().insertAttendance(
                        Attendance(
                            userId      = userId,
                            userName    = userName,
                            type        = "check_in",
                            source      = "auto_geo",
                            lat         = currentLocation.latitude,
                            lng         = currentLocation.longitude,
                            timestampMs = System.currentTimeMillis(),
                        )
                    )
                    NotificationHelper.sendAutoCheckInNotification(applicationContext, userName, "check_in")
                    Log.d(TAG, "Auto check-in for $userName")

                } else if (!isInStore && lastType == "check_in") {
                    // Auto check-out
                    db.trackerDao().insertAttendance(
                        Attendance(
                            userId      = userId,
                            userName    = userName,
                            type        = "check_out",
                            source      = "auto_geo",
                            lat         = currentLocation.latitude,
                            lng         = currentLocation.longitude,
                            timestampMs = System.currentTimeMillis(),
                        )
                    )
                    NotificationHelper.sendAutoCheckInNotification(applicationContext, userName, "check_out")
                    Log.d(TAG, "Auto check-out for $userName")
                }

                Result.success()
            } catch (e: Exception) {
                Log.e(TAG, "Location worker error", e)
                Result.retry()
            }
        }
    }

    /**
     * Get current GPS location using FusedLocationProviderClient.
     * Returns null if location unavailable or permission denied.
     */
    private suspend fun getCurrentLocation(): Location? {
        return try {
            val client = com.google.android.gms.location.LocationServices
                .getFusedLocationProviderClient(applicationContext)

            var result: Location? = null
            val task = client.lastLocation
            // Wait for location result synchronously
            val countDown = java.util.concurrent.CountDownLatch(1)
            task.addOnSuccessListener { loc ->
                result = loc
                countDown.countDown()
            }.addOnFailureListener {
                countDown.countDown()
            }
            countDown.await(10, TimeUnit.SECONDS)
            result
        } catch (e: SecurityException) {
            Log.w(TAG, "Location permission denied in worker")
            null
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get location", e)
            null
        }
    }
}
