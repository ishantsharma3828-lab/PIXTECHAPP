package com.pixtech.pos.data

import androidx.room.*
import com.pixtech.pos.data.entities.*
import kotlinx.coroutines.flow.Flow

/**
 * TrackerDao — Room DAO for all employee tracker operations.
 */
@Dao
interface TrackerDao {

    // ─── Attendance ──────────────────────────────────────────────────────────
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAttendance(log: Attendance)

    @Query("SELECT * FROM attendance ORDER BY timestampMs DESC")
    suspend fun getAllAttendance(): List<Attendance>

    @Query("SELECT * FROM attendance WHERE userId = :userId ORDER BY timestampMs DESC")
    suspend fun getAttendanceForUser(userId: String): List<Attendance>

    // ─── Employee Locations ───────────────────────────────────────────────────
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertEmployeeLocation(location: EmployeeLocation)

    @Query("SELECT * FROM employee_location ORDER BY userName ASC")
    suspend fun getAllEmployeeLocations(): List<EmployeeLocation>

    @Query("SELECT * FROM employee_location WHERE userId = :userId")
    suspend fun getEmployeeLocation(userId: String): EmployeeLocation?

    // ─── Duties ──────────────────────────────────────────────────────────────
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertDuty(duty: Duty)

    @Query("SELECT * FROM duty WHERE userId = :userId ORDER BY dateMs DESC")
    suspend fun getDutiesForUser(userId: String): List<Duty>

    @Query("UPDATE duty SET isCompleted = NOT isCompleted WHERE id = :id")
    suspend fun toggleDuty(id: Int)

    @Query("DELETE FROM duty WHERE id = :id")
    suspend fun deleteDutyById(id: Int)

    // ─── KPIs ────────────────────────────────────────────────────────────────
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertKpi(kpi: Kpi)

    @Query("SELECT * FROM kpi WHERE userId = :userId ORDER BY id ASC")
    suspend fun getKpisForUser(userId: String): List<Kpi>

    @Query("UPDATE kpi SET currentValue = :value WHERE id = :id")
    suspend fun updateKpiValue(id: Int, value: Float)

    @Query("DELETE FROM kpi WHERE id = :id")
    suspend fun deleteKpiById(id: Int)

    // ─── Notes ───────────────────────────────────────────────────────────────
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertNote(note: Note)

    @Query("SELECT * FROM note WHERE userId = :userId ORDER BY dateMs DESC")
    suspend fun getNotesForUser(userId: String): List<Note>

    @Query("DELETE FROM note WHERE id = :id")
    suspend fun deleteNoteById(id: Int)

    // ─── Missing Products ─────────────────────────────────────────────────────
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMissingProduct(product: MissingProduct)

    @Query("SELECT * FROM missing_product ORDER BY reportedMs DESC")
    suspend fun getAllMissingProducts(): List<MissingProduct>

    @Query("DELETE FROM missing_product WHERE id = :id")
    suspend fun deleteMissingProductById(id: Int)

    // ─── Calendar Events ──────────────────────────────────────────────────────
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCalendarEvent(event: CalendarEvent)

    @Query("SELECT * FROM calendar_event ORDER BY createdAt DESC")
    suspend fun getAllCalendarEvents(): List<CalendarEvent>

    @Query("DELETE FROM calendar_event WHERE id = :id")
    suspend fun deleteCalendarEventById(id: String)

    // ─── Store Settings ───────────────────────────────────────────────────────
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertStoreSettings(settings: StoreSettings)

    @Query("SELECT * FROM store_settings WHERE id = 1")
    suspend fun getStoreSettings(): StoreSettings?
}
