import sys

file_path = "src/components/views/JadwalMengajarView.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add todaySesi in paginatedJadwal.map if missing
target_paginated = "paginatedJadwal.map((item, idx) => {"
if target_paginated in content and "const todaySesi = getSesiForJadwalToday(item.id);" not in content:
    content = content.replace(
        target_paginated,
        target_paginated + "\n                        const todaySesi = getSesiForJadwalToday(item.id);"
    )

# 2. Add Absen Kelas button inside groupSchedules action div
# Target in groupSchedules: <div className="flex items-center justify-center gap-1">
# We can replace the first occurrence in table with our button inserted
button_jsx = '''<div className="flex items-center justify-center gap-1.5 flex-wrap">
                                         <button
                                           type="button"
                                           onClick={() => handleOpenAbsenSiswa(item)}
                                           className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs ${
                                             todaySesi
                                               ? 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                               : 'bg-blue-600 hover:bg-blue-700 text-white'
                                           }`}
                                           title={todaySesi ? 'Edit Absensi Siswa Kelas Hari Ini' : 'Buka Lembar Absen Kelas'}
                                         >
                                           <UserCheck className="w-3.5 h-3.5" />
                                           <span>{todaySesi ? 'Sudah Absen' : 'Absen Kelas'}</span>
                                         </button>'''

# Replace action div in groupSchedules and paginatedJadwal
old_action_div = '<div className="flex items-center justify-center gap-1">'
content = content.replace(old_action_div, button_jsx)

# 3. Add todaySesi and Absen Kelas button to Matrix cell
# Target in schedulesToDisplay.map:
target_schedules_map = "schedulesToDisplay.map((matchedSchedule, sIdx) => ("
replacement_schedules_map = """schedulesToDisplay.map((matchedSchedule, sIdx) => {
                                     const todaySesi = getSesiForJadwalToday(matchedSchedule.id);
                                     return ("""

content = content.replace(target_schedules_map, replacement_schedules_map)

# In Matrix card, find the end of the card before </div></div>))}
# Let's search for handleStartEdit(matchedSchedule) and add the button right after the edit/delete buttons wrapper
matrix_button_jsx = '''<button
                                         type="button"
                                         onClick={() => handleOpenAbsenSiswa(matchedSchedule)}
                                         className={`mt-1.5 w-full py-1 px-2 rounded-lg text-[10px] font-black transition flex items-center justify-center gap-1 shadow-2xs cursor-pointer ${
                                           todaySesi
                                             ? 'bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                                             : 'bg-blue-600 hover:bg-blue-700 text-white'
                                         }`}
                                         title={todaySesi ? 'Edit Absensi Kelas Hari Ini' : 'Buka Lembar Absen Kelas'}
                                       >
                                         <UserCheck className="w-3 h-3" />
                                         <span>{todaySesi ? 'Sudah Diabsen ✓' : 'Absen Kelas'}</span>
                                       </button>'''

# Find point after Trash2 in matrix card
target_matrix_actions = 'aria-label="Hapus Jadwal"\n                                             >\n                                               <Trash2 className="w-3.5 h-3.5" />\n                                             </button>\n                                           </div>\n                                         )}'

replacement_matrix_actions = target_matrix_actions + "\n                                       " + matrix_button_jsx

content = content.replace(target_matrix_actions, replacement_matrix_actions)

# Fix the closing of schedulesToDisplay.map return statement from ) to })
# We changed schedulesToDisplay.map((matchedSchedule, sIdx) => ( to return (
# so we need to change the matching ))) to });
target_closing_map = "</div>\n                                   ))}"
replacement_closing_map = "div>\n                                   })}"
content = content.replace(target_closing_map, replacement_closing_map)

# 4. Add RiwayatPresensiMengajarTab mounting under absen_guru tab
absen_guru_tab_end = "initialShiftOption={tableShiftOption}\n        />\n      )}"
riwayat_tab_mounting = absen_guru_tab_end + """

      {/* =====================================================================
          TAB: RIWAYAT ABSEN MENGAJAR GURU (Jurnal KBM Mandiri)
          ===================================================================== */}
      {activeTab === 'riwayat_absen_mengajar' && (
        <RiwayatPresensiMengajarTab
          appData={appData}
          currentUser={currentUser}
          readOnly={readOnly}
          onOpenAbsenModal={handleOpenAbsenFromSesi}
          onDeleteSesi={handleDeleteSesiMengajar}
          onShowToast={onShowToast}
        />
      )}"""

content = content.replace(absen_guru_tab_end, riwayat_tab_mounting)

# 5. Add ModalAbsenSiswaMengajar at the end of component before final </div>
end_component_target = "</div>\n  );\n};"
modal_mounting = """
      {/* Modal Absensi Siswa Kelas Mengajar Guru (Jurnal KBM Mandiri) */}
      <ModalAbsenSiswaMengajar
        isOpen={isAbsenSiswaModalOpen}
        onClose={() => {
          setIsAbsenSiswaModalOpen(false);
          setSelectedJadwalForAbsen(null);
          setSelectedExistingSesi(null);
        }}
        jadwal={selectedJadwalForAbsen}
        appData={appData}
        currentUser={currentUser}
        onSave={handleSaveSesiMengajar}
        onShowToast={onShowToast}
        existingSesi={selectedExistingSesi}
      />
    </div>
  );
};"""

content = content.replace(end_component_target, modal_mounting)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated successfully!")
