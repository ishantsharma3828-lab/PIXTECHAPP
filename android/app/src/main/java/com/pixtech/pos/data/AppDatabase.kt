package com.pixtech.pos.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.pixtech.pos.data.entities.*

/**
 * AppDatabase — Room singleton database for PIX TECH POS tracker.
 * Version 1 includes all tracker entities.
 */
@Database(
    entities = [
        Attendance::class,
        EmployeeLocation::class,
        Duty::class,
        Kpi::class,
        Note::class,
        MissingProduct::class,
        CalendarEvent::class,
        StoreSettings::class,
    ],
    version = 1,
    exportSchema = false,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun trackerDao(): TrackerDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "pixtech_tracker_db",
                )
                    .fallbackToDestructiveMigration()
                    .build()
                    .also { INSTANCE = it }
            }
        }
    }
}
