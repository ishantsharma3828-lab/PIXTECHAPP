package com.pixtech.pos.data.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room database entities for the PIX TECH POS employee tracker.
 * Expanded from the original my-tracker app to support multi-user tracking.
 */

// ─── Attendance ───────────────────────────────────────────────────────────────
@Entity(tableName = "attendance")
data class Attendance(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val userId:      String,  // Staff user ID
    val userName:    String,  // Display name
    val type:        String,  // "check_in" | "check_out"
    val source:      String,  // "manual" | "auto_geo"
    val lat:         Double,
    val lng:         Double,
    val timestampMs: Long,
)

// ─── Employee Location (live GPS, updated by LocationWorker) ──────────────────
@Entity(tableName = "employee_location")
data class EmployeeLocation(
    @PrimaryKey val userId:     String,
    val userName:  String,
    val lat:       Double,
    val lng:       Double,
    val lastSeenMs: Long,
    val isInStore:  Boolean,
)

// ─── Duties (per-user task checklist) ────────────────────────────────────────
@Entity(tableName = "duty")
data class Duty(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val userId:      String,
    val title:       String,
    val isCompleted: Boolean,
    val dateMs:      Long,
)

// ─── KPIs (per-user performance targets) ─────────────────────────────────────
@Entity(tableName = "kpi")
data class Kpi(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val userId:       String,
    val title:        String,
    val currentValue: Float,
    val targetValue:  Float,
    val unit:         String,
)

// ─── Notes (per-user private notes) ──────────────────────────────────────────
@Entity(tableName = "note")
data class Note(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val userId:  String,
    val title:   String,
    val content: String,
    val dateMs:  Long,
)

// ─── Missing Products (reported via barcode scanner) ─────────────────────────
@Entity(tableName = "missing_product")
data class MissingProduct(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val barcode:    String,
    val name:       String,
    val reportedMs: Long,
    val reportedBy: String,
)

// ─── Calendar Events (broadcast by admin) ────────────────────────────────────
@Entity(tableName = "calendar_event")
data class CalendarEvent(
    @PrimaryKey val id:        String,
    val title:     String,
    val body:      String,
    val dateMs:    Long,
    val createdBy: String,
    val createdAt: Long,
)

// ─── Store Settings (location for geo-fencing) ───────────────────────────────
@Entity(tableName = "store_settings")
data class StoreSettings(
    @PrimaryKey val id:           Int = 1,
    val storeLat:     Double = 0.0,
    val storeLng:     Double = 0.0,
    val radiusMeters: Int    = 200,  // Auto check-in/out radius
    val openingTimeMs: Long  = 0L,
    val closingTimeMs: Long  = 0L,
)
