package com.pixtech.pos.plugins

import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.pixtech.pos.data.AppDatabase
import com.pixtech.pos.data.entities.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * TrackerPlugin
 * ──────────────────────────────────────────────────────────────────────────────
 * Capacitor bridge plugin that exposes the employee tracker native capabilities
 * to the web layer (React/TypeScript running in the WebView).
 *
 * Every method annotated with @PluginMethod is callable from JS via:
 *   Capacitor.Plugins.TrackerPlugin.methodName({ ...args })
 *
 * All database operations run on Dispatchers.IO and return results on the
 * main thread via resolve().
 */
@CapacitorPlugin(name = "TrackerPlugin")
class TrackerPlugin : Plugin() {

    private val db: AppDatabase by lazy { AppDatabase.getDatabase(context) }
    private val scope = CoroutineScope(Dispatchers.IO)

    // ─── Attendance ──────────────────────────────────────────────────────────

    @PluginMethod
    fun checkIn(call: PluginCall) {
        val userId   = call.getString("userId")   ?: return call.reject("userId required")
        val userName = call.getString("userName") ?: "Employee"
        scope.launch {
            db.trackerDao().insertAttendance(
                Attendance(
                    userId      = userId,
                    userName    = userName,
                    type        = "check_in",
                    source      = "manual",
                    lat         = 0.0,
                    lng         = 0.0,
                    timestampMs = System.currentTimeMillis(),
                )
            )
            withContext(Dispatchers.Main) { call.resolve() }
        }
    }

    @PluginMethod
    fun checkOut(call: PluginCall) {
        val userId   = call.getString("userId")   ?: return call.reject("userId required")
        val userName = call.getString("userName") ?: "Employee"
        scope.launch {
            db.trackerDao().insertAttendance(
                Attendance(
                    userId      = userId,
                    userName    = userName,
                    type        = "check_out",
                    source      = "manual",
                    lat         = 0.0,
                    lng         = 0.0,
                    timestampMs = System.currentTimeMillis(),
                )
            )
            withContext(Dispatchers.Main) { call.resolve() }
        }
    }

    @PluginMethod
    fun getAttendanceLogs(call: PluginCall) {
        val userId = call.getString("userId") // null = all (admin)
        scope.launch {
            val logs = if (userId != null) {
                db.trackerDao().getAttendanceForUser(userId)
            } else {
                db.trackerDao().getAllAttendance()
            }
            val arr = JSArray().apply {
                logs.forEach { log ->
                    put(JSObject().apply {
                        put("id",          log.id)
                        put("userId",      log.userId)
                        put("userName",    log.userName)
                        put("type",        log.type)
                        put("source",      log.source)
                        put("lat",         log.lat)
                        put("lng",         log.lng)
                        put("timestampMs", log.timestampMs)
                    })
                }
            }
            withContext(Dispatchers.Main) {
                call.resolve(JSObject().put("logs", arr))
            }
        }
    }

    // ─── Employee Locations (admin) ──────────────────────────────────────────

    @PluginMethod
    fun getAllEmployeeLocations(call: PluginCall) {
        scope.launch {
            val locations = db.trackerDao().getAllEmployeeLocations()
            val arr = JSArray().apply {
                locations.forEach { loc ->
                    put(JSObject().apply {
                        put("userId",     loc.userId)
                        put("userName",   loc.userName)
                        put("lat",        loc.lat)
                        put("lng",        loc.lng)
                        put("lastSeenMs", loc.lastSeenMs)
                        put("isInStore",  loc.isInStore)
                    })
                }
            }
            withContext(Dispatchers.Main) {
                call.resolve(JSObject().put("locations", arr))
            }
        }
    }

    // ─── Current Location ────────────────────────────────────────────────────

    @PluginMethod
    fun getCurrentLocation(call: PluginCall) {
        // Delegate to the Geolocation Capacitor plugin for actual GPS
        // For now, return a placeholder — the web layer uses @capacitor/geolocation
        call.resolve(JSObject().apply {
            put("lat", 0.0)
            put("lng", 0.0)
        })
    }

    // ─── Barcode Scanner ─────────────────────────────────────────────────────

    @PluginMethod
    fun scanBarcode(call: PluginCall) {
        // Delegate to @capacitor/barcode-scanner or CameraX via a pending call
        // Store call reference and launch scanner Activity
        // For now we use @capacitor/camera which is already installed
        // The web layer handles the camera UI via CameraX and ML Kit in ScannerScreen.kt logic
        call.reject("Use native camera plugin from web layer")
    }

    // ─── Duties ──────────────────────────────────────────────────────────────

    @PluginMethod
    fun getDuties(call: PluginCall) {
        val userId = call.getString("userId") ?: return call.reject("userId required")
        scope.launch {
            val duties = db.trackerDao().getDutiesForUser(userId)
            val arr = JSArray().apply {
                duties.forEach { d ->
                    put(JSObject().apply {
                        put("id",          d.id)
                        put("title",       d.title)
                        put("isCompleted", d.isCompleted)
                        put("dateMs",      d.dateMs)
                    })
                }
            }
            withContext(Dispatchers.Main) { call.resolve(JSObject().put("duties", arr)) }
        }
    }

    @PluginMethod
    fun addDuty(call: PluginCall) {
        val userId = call.getString("userId") ?: return call.reject("userId required")
        val title  = call.getString("title")  ?: return call.reject("title required")
        scope.launch {
            db.trackerDao().insertDuty(Duty(userId = userId, title = title, isCompleted = false, dateMs = System.currentTimeMillis()))
            withContext(Dispatchers.Main) { call.resolve() }
        }
    }

    @PluginMethod
    fun toggleDuty(call: PluginCall) {
        val id = call.getInt("id") ?: return call.reject("id required")
        scope.launch {
            db.trackerDao().toggleDuty(id)
            withContext(Dispatchers.Main) { call.resolve() }
        }
    }

    @PluginMethod
    fun deleteDuty(call: PluginCall) {
        val id = call.getInt("id") ?: return call.reject("id required")
        scope.launch {
            db.trackerDao().deleteDutyById(id)
            withContext(Dispatchers.Main) { call.resolve() }
        }
    }

    // ─── Notes ───────────────────────────────────────────────────────────────

    @PluginMethod
    fun getNotes(call: PluginCall) {
        val userId = call.getString("userId") ?: return call.reject("userId required")
        scope.launch {
            val notes = db.trackerDao().getNotesForUser(userId)
            val arr = JSArray().apply {
                notes.forEach { n ->
                    put(JSObject().apply {
                        put("id",      n.id)
                        put("title",   n.title)
                        put("content", n.content)
                        put("dateMs",  n.dateMs)
                        put("userId",  n.userId)
                    })
                }
            }
            withContext(Dispatchers.Main) { call.resolve(JSObject().put("notes", arr)) }
        }
    }

    @PluginMethod
    fun addNote(call: PluginCall) {
        val userId  = call.getString("userId")  ?: return call.reject("userId required")
        val title   = call.getString("title")   ?: return call.reject("title required")
        val content = call.getString("content") ?: ""
        scope.launch {
            db.trackerDao().insertNote(Note(userId = userId, title = title, content = content, dateMs = System.currentTimeMillis()))
            withContext(Dispatchers.Main) { call.resolve() }
        }
    }

    @PluginMethod
    fun deleteNote(call: PluginCall) {
        val id = call.getInt("id") ?: return call.reject("id required")
        scope.launch {
            db.trackerDao().deleteNoteById(id)
            withContext(Dispatchers.Main) { call.resolve() }
        }
    }

    // ─── KPIs ────────────────────────────────────────────────────────────────

    @PluginMethod
    fun getKpis(call: PluginCall) {
        val userId = call.getString("userId") ?: return call.reject("userId required")
        scope.launch {
            val kpis = db.trackerDao().getKpisForUser(userId)
            val arr = JSArray().apply {
                kpis.forEach { k ->
                    put(JSObject().apply {
                        put("id",           k.id)
                        put("title",        k.title)
                        put("currentValue", k.currentValue)
                        put("targetValue",  k.targetValue)
                        put("unit",         k.unit)
                    })
                }
            }
            withContext(Dispatchers.Main) { call.resolve(JSObject().put("kpis", arr)) }
        }
    }

    @PluginMethod
    fun addKpi(call: PluginCall) {
        val userId = call.getString("userId") ?: return call.reject("userId required")
        val title  = call.getString("title")  ?: return call.reject("title required")
        val target = call.getDouble("target") ?: 100.0
        val unit   = call.getString("unit")   ?: "units"
        scope.launch {
            db.trackerDao().insertKpi(Kpi(userId = userId, title = title, currentValue = 0f, targetValue = target.toFloat(), unit = unit))
            withContext(Dispatchers.Main) { call.resolve() }
        }
    }

    @PluginMethod
    fun updateKpi(call: PluginCall) {
        val id    = call.getInt("id")       ?: return call.reject("id required")
        val value = call.getDouble("value") ?: return call.reject("value required")
        scope.launch {
            db.trackerDao().updateKpiValue(id, value.toFloat())
            withContext(Dispatchers.Main) { call.resolve() }
        }
    }

    @PluginMethod
    fun deleteKpi(call: PluginCall) {
        val id = call.getInt("id") ?: return call.reject("id required")
        scope.launch {
            db.trackerDao().deleteKpiById(id)
            withContext(Dispatchers.Main) { call.resolve() }
        }
    }

    // ─── Missing Products ────────────────────────────────────────────────────

    @PluginMethod
    fun getMissingProducts(call: PluginCall) {
        scope.launch {
            val products = db.trackerDao().getAllMissingProducts()
            val arr = JSArray().apply {
                products.forEach { p ->
                    put(JSObject().apply {
                        put("id",          p.id)
                        put("barcode",     p.barcode)
                        put("name",        p.name)
                        put("reportedMs",  p.reportedMs)
                        put("reportedBy",  p.reportedBy)
                    })
                }
            }
            withContext(Dispatchers.Main) { call.resolve(JSObject().put("products", arr)) }
        }
    }

    @PluginMethod
    fun addMissingProduct(call: PluginCall) {
        val barcode    = call.getString("barcode")    ?: return call.reject("barcode required")
        val name       = call.getString("name")       ?: "Unknown"
        val reportedBy = call.getString("reportedBy") ?: "Employee"
        scope.launch {
            db.trackerDao().insertMissingProduct(MissingProduct(barcode = barcode, name = name, reportedMs = System.currentTimeMillis(), reportedBy = reportedBy))
            withContext(Dispatchers.Main) { call.resolve() }
        }
    }

    @PluginMethod
    fun deleteMissingProduct(call: PluginCall) {
        val id = call.getInt("id") ?: return call.reject("id required")
        scope.launch {
            db.trackerDao().deleteMissingProductById(id)
            withContext(Dispatchers.Main) { call.resolve() }
        }
    }

    // ─── Calendar Events ─────────────────────────────────────────────────────

    @PluginMethod
    fun getCalendarEvents(call: PluginCall) {
        scope.launch {
            val events = db.trackerDao().getAllCalendarEvents()
            val arr = JSArray().apply {
                events.forEach { e ->
                    put(JSObject().apply {
                        put("id",          e.id)
                        put("title",       e.title)
                        put("body",        e.body)
                        put("dateMs",      e.dateMs)
                        put("createdBy",   e.createdBy)
                        put("createdAt",   e.createdAt)
                    })
                }
            }
            withContext(Dispatchers.Main) { call.resolve(JSObject().put("events", arr)) }
        }
    }

    @PluginMethod
    fun broadcastEvent(call: PluginCall) {
        val title     = call.getString("title")     ?: return call.reject("title required")
        val body      = call.getString("body")      ?: ""
        val dateMs    = call.getLong("dateMs")      ?: System.currentTimeMillis()
        val createdBy = call.getString("createdBy") ?: "admin"

        scope.launch {
            val event = CalendarEvent(
                id        = "evt_${System.currentTimeMillis()}",
                title     = title,
                body      = body,
                dateMs    = dateMs,
                createdBy = createdBy,
                createdAt = System.currentTimeMillis(),
            )
            db.trackerDao().insertCalendarEvent(event)

            // Send local notification to all employees
            withContext(Dispatchers.Main) {
                NotificationHelper.sendBroadcastNotification(context, title, body)
                call.resolve()
            }
        }
    }

    @PluginMethod
    fun deleteCalendarEvent(call: PluginCall) {
        val id = call.getString("id") ?: return call.reject("id required")
        scope.launch {
            db.trackerDao().deleteCalendarEventById(id)
            withContext(Dispatchers.Main) { call.resolve() }
        }
    }
}
