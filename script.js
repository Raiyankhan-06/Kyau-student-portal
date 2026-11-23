/* ==========================================================
   Kyau Student Portal - Student Information & Result Management
   Pure JavaScript (no libraries). Data is kept in localStorage;
   if the browser blocks storage the app still works for the session.
   ========================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     1. CONSTANTS
     --------------------------------------------------------- */
  var STORAGE_KEY = 'resulthub_sirms_v1';
  var DEPTS = ['CSE', 'EEE', 'BBA', 'English'];
  var COURSE_DEPTS = DEPTS.concat(['General']);
  var CREDITS = [1, 1.5, 2, 3, 4];
  var SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

  // Grading scale (4.00 system). First row whose "min" is <= marks is used.
  var SCALE = [
    { min: 80, grade: 'A+', gp: 4.00, remark: 'Outstanding', cls: 'g-a' },
    { min: 75, grade: 'A',  gp: 3.75, remark: 'Excellent',   cls: 'g-a' },
    { min: 70, grade: 'A-', gp: 3.50, remark: 'Very good',   cls: 'g-a' },
    { min: 65, grade: 'B+', gp: 3.25, remark: 'Good',        cls: 'g-b' },
    { min: 60, grade: 'B',  gp: 3.00, remark: 'Above average', cls: 'g-b' },
    { min: 55, grade: 'B-', gp: 2.75, remark: 'Average',     cls: 'g-b' },
    { min: 50, grade: 'C+', gp: 2.50, remark: 'Satisfactory', cls: 'g-c' },
    { min: 45, grade: 'C',  gp: 2.25, remark: 'Acceptable',  cls: 'g-c' },
    { min: 40, grade: 'D',  gp: 2.00, remark: 'Pass',        cls: 'g-d' },
    { min: 0,  grade: 'F',  gp: 0.00, remark: 'Fail',        cls: 'g-f' }
  ];
  var RANGES = ['80 - 100', '75 - 79', '70 - 74', '65 - 69', '60 - 64', '55 - 59', '50 - 54', '45 - 49', '40 - 44', '0 - 39'];

  /* ---------------------------------------------------------
     2. SMALL HELPERS
     --------------------------------------------------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(v) {
    return String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt2(n) { return Number(n).toFixed(2); }
  function fmtCredit(n) { return Number(n) % 1 === 0 ? String(n) : Number(n).toFixed(1); }
  function initials(name) {
    var p = String(name).trim().split(/\s+/);
    return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }
  var AV_COLORS = ['#23408e', '#0e9f8e', '#7c3aed', '#c2410c', '#be185d', '#0369a1', '#4d7c0f', '#b45309'];
  function avatar(name, size, photo) {
    var cls = 'avatar' + (size === 'xl' ? ' xl' : (size ? ' lg' : ''));
    if (photo) { return '<img class="' + cls + '" src="' + esc(photo) + '" alt="Photo of ' + esc(name) + '">'; }
    var h = 0, s = String(name);
    for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
    return '<span class="' + cls + '" style="background:' + AV_COLORS[h % AV_COLORS.length] + '">' + esc(initials(name)) + '</span>';
  }
  function gradeOf(marks) {
    for (var i = 0; i < SCALE.length; i++) { if (marks >= SCALE[i].min) { return SCALE[i]; } }
    return SCALE[SCALE.length - 1];
  }
  function gradeBadge(g) { return '<span class="badge ' + g.cls + '">' + g.grade + '</span>'; }
  function optionList(arr, selected, labelFn) {
    return arr.map(function (v) {
      return '<option value="' + esc(v) + '"' + (String(v) === String(selected) ? ' selected' : '') + '>' + esc(labelFn ? labelFn(v) : v) + '</option>';
    }).join('');
  }

  /* ---------------------------------------------------------
     3. DATA STORE (localStorage with in-memory fallback)
     --------------------------------------------------------- */
  var db = { students: [], courses: [], results: [] };
  var memoryCopy = null;
  var storageOk = true;

  function loadDb() {
    var raw = null;
    try { raw = window.localStorage.getItem(STORAGE_KEY); } catch (e) { storageOk = false; }
    if (!raw && memoryCopy) { raw = memoryCopy; }
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.students && parsed.courses && parsed.results) { db = parsed; return; }
      } catch (e2) { /* fall through to sample data */ }
    }
    db = sampleData();
    saveDb();
  }
  function updateStorageNote() {
    var el = $('#storageNote');
    if (el) {
      el.textContent = storageOk
        ? 'Data is saved in this browser (localStorage).'
        : 'Browser storage is blocked or full - data lasts until the page is closed.';
    }
  }
  function saveDb() {
    var s = JSON.stringify(db);
    memoryCopy = s;
    try { window.localStorage.setItem(STORAGE_KEY, s); }
    catch (e) {
      if (storageOk) { storageOk = false; updateStorageNote(); toast('Browser storage is blocked or full - changes last only until the page is closed.', true); }
    }
  }

  function sampleData() {
    var students = [
      { id: 'STU-1001', name: 'Nusrat Jahan',   dept: 'CSE',     semester: 2, email: 'nusrat.jahan@example.com',   phone: '01711-000101', dob: '2005-03-14' },
      { id: 'STU-1002', name: 'Sabbir Ahmed',   dept: 'CSE',     semester: 2, email: 'sabbir.ahmed@example.com',   phone: '01711-000102', dob: '2004-11-02' },
      { id: 'STU-1003', name: 'Farhana Akter',  dept: 'CSE',     semester: 2, email: 'farhana.akter@example.com',  phone: '01711-000103', dob: '2005-07-21' },
      { id: 'STU-1004', name: 'Tanvir Rahman',  dept: 'EEE',     semester: 2, email: 'tanvir.rahman@example.com',  phone: '01711-000104', dob: '2004-09-09' },
      { id: 'STU-1005', name: 'Mitu Sultana',   dept: 'BBA',     semester: 2, email: 'mitu.sultana@example.com',   phone: '01711-000105', dob: '2005-01-30' },
      { id: 'STU-1006', name: 'Rafiq Islam',    dept: 'BBA',     semester: 1, email: 'rafiq.islam@example.com',    phone: '01711-000106', dob: '2005-05-17' },
      { id: 'STU-1007', name: 'Imran Hossain',  dept: 'EEE',     semester: 1, email: 'imran.hossain@example.com',  phone: '',             dob: '2004-12-25' },
      { id: 'STU-1008', name: 'Shirin Begum',   dept: 'English', semester: 1, email: 'shirin.begum@example.com',   phone: '01711-000108', dob: '2005-08-08' }
    ];
    var parents = {
      'STU-1001': ['Md. Abdul Karim', 'Rokeya Begum'],
      'STU-1002': ['Md. Nazrul Islam', 'Salma Khatun'],
      'STU-1003': ['Md. Shahidul Alam', 'Hasina Akter'],
      'STU-1004': ['Md. Habibur Rahman', 'Morjina Begum'],
      'STU-1005': ['Md. Anwar Hossain', 'Nasima Sultana'],
      'STU-1006': ['Md. Jahangir Alam', 'Shahnaz Parvin'],
      'STU-1007': ['Md. Delwar Hossain', 'Rahima Khatun']
    };
    students.forEach(function (s) {
      var p = parents[s.id] || ['', ''];   // STU-1008 is left empty on purpose: the student adds it
      s.fatherName = p[0]; s.motherName = p[1]; s.photo = '';
    });
    var courses = [
      { code: 'ENG101', title: 'English Composition',            credit: 3, dept: 'General' },
      { code: 'MAT101', title: 'Differential Calculus',          credit: 3, dept: 'General' },
      { code: 'PHY101', title: 'Physics I',                      credit: 3, dept: 'General' },
      { code: 'CSE101', title: 'Introduction to Programming',    credit: 3, dept: 'CSE' },
      { code: 'CSE102', title: 'Programming Lab',                credit: 1.5, dept: 'CSE' },
      { code: 'CSE201', title: 'Data Structures',                credit: 3, dept: 'CSE' },
      { code: 'EEE101', title: 'Basic Electrical Engineering',   credit: 3, dept: 'EEE' },
      { code: 'BBA101', title: 'Principles of Management',       credit: 3, dept: 'BBA' },
      { code: 'ENG201', title: 'Introduction to Literature',     credit: 3, dept: 'English' }
    ];
    // marks[studentId] = [ [courseCode, semester, marks], ... ]
    var marks = {
      'STU-1001': [['ENG101', 1, 86], ['MAT101', 1, 82], ['CSE101', 1, 91], ['CSE102', 1, 88], ['PHY101', 2, 79], ['CSE201', 2, 84]],
      'STU-1002': [['ENG101', 1, 72], ['MAT101', 1, 68], ['CSE101', 1, 77], ['CSE102', 1, 81], ['PHY101', 2, 64], ['CSE201', 2, 70]],
      'STU-1003': [['ENG101', 1, 58], ['MAT101', 1, 52], ['CSE101', 1, 63], ['CSE102', 1, 74], ['PHY101', 2, 47], ['CSE201', 2, 55]],
      'STU-1004': [['ENG101', 1, 66], ['MAT101', 1, 73], ['EEE101', 1, 78], ['PHY101', 2, 69]],
      'STU-1005': [['ENG101', 1, 80], ['MAT101', 1, 61], ['BBA101', 1, 85], ['PHY101', 2, 57]],
      'STU-1006': [['ENG101', 1, 49], ['BBA101', 1, 62]],
      'STU-1007': [['ENG101', 1, 35], ['MAT101', 1, 42], ['EEE101', 1, 51]],
      'STU-1008': [['ENG101', 1, 90], ['ENG201', 1, 87]]
    };
    var results = [];
    Object.keys(marks).forEach(function (sid) {
      marks[sid].forEach(function (m) { results.push({ studentId: sid, code: m[0], semester: m[1], marks: m[2] }); });
    });
    return { students: students, courses: courses, results: results };
  }

  /* lookups */
  function studentById(id) { return db.students.filter(function (s) { return s.id === id; })[0]; }
  function courseByCode(code) { return db.courses.filter(function (c) { return c.code === code; })[0]; }
  function resultsOf(id) { return db.results.filter(function (r) { return r.studentId === id; }); }

  /* ---------------------------------------------------------
     4. GPA CALCULATION
        GPA = sum(grade point x credit) / sum(credit)
     --------------------------------------------------------- */
  function gpaOf(list) {
    var points = 0, credits = 0, fails = 0;
    list.forEach(function (r) {
      var c = courseByCode(r.code);
      if (!c) { return; }
      var g = gradeOf(r.marks);
      points += g.gp * c.credit;
      credits += c.credit;
      if (g.gp === 0) { fails += 1; }
    });
    return { gpa: credits ? points / credits : 0, credits: credits, points: points, fails: fails, count: list.length };
  }
  function standing(cg) {
    if (cg >= 3.75) { return 'Excellent'; }
    if (cg >= 3.25) { return 'Very good'; }
    if (cg >= 2.75) { return 'Good'; }
    if (cg >= 2.25) { return 'Satisfactory'; }
    if (cg >= 2.00) { return 'Pass'; }
    return 'Needs improvement';
  }
  function statusOf(summary) {
    if (!summary.count) { return { text: 'No result', cls: 'st-none' }; }
    return summary.fails ? { text: 'Failed in ' + summary.fails + ' course' + (summary.fails > 1 ? 's' : ''), cls: 'st-fail' } : { text: 'Passed', cls: 'st-pass' };
  }

  /* ---------------------------------------------------------
     5. UI HELPERS: toast, confirm dialog, validation
     --------------------------------------------------------- */
  var toastTimer = null;
  function toast(msg, isError) {
    var t = $('#toast');
    t.textContent = msg;
    t.className = 'toast show' + (isError ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'toast'; }, 2600);
  }

  var confirmResolve = null;
  function confirmBox(message, yesLabel) {
    $('#confirmText').textContent = message;
    $('#confirmYes').textContent = yesLabel || 'Delete';
    $('#confirmOverlay').hidden = false;
    $('#confirmNo').focus();
    return new Promise(function (resolve) { confirmResolve = resolve; });
  }
  function closeConfirm(answer) {
    $('#confirmOverlay').hidden = true;
    if (confirmResolve) { confirmResolve(answer); confirmResolve = null; }
  }

  function setError(fieldId, msg) {
    var input = $('#' + fieldId);
    var holder = input.closest('.field');
    var el = $('.err[data-for="' + fieldId + '"]');
    if (holder) { holder.classList.toggle('invalid', !!msg); }
    if (el) { el.textContent = msg || ''; }
    return !msg;
  }
  function clearErrors(form) {
    $$('.field.invalid', form).forEach(function (f) { f.classList.remove('invalid'); });
    $$('.err', form).forEach(function (e) { e.textContent = ''; });
  }

  /* ---------------------------------------------------------
     6. NAVIGATION
     --------------------------------------------------------- */
  var state = { view: 'dashboard', profileId: null, editStudent: null, editCourse: null, editMark: null, searchPick: null, searchCurrent: null, pendingPhoto: undefined };

  function showView(name, arg) {
    state.view = name;
    if (name === 'profile') { if (arg) { state.profileId = arg; } closeProfileEdit(); }
    $$('.view').forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + name); });
    $$('#nav button').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-view') === name); });
    renderView(name);
    window.scrollTo(0, 0);
  }
  function renderView(name) {
    if (name === 'dashboard') { renderDashboard(); }
    else if (name === 'students') { renderStudents(); }
    else if (name === 'profile') { renderProfile(); }
    else if (name === 'courses') { renderCourses(); }
    else if (name === 'marks') { renderMarks(); }
    else if (name === 'search') { renderSearch(); }
  }
  function refresh() { fillSelects(); renderView(state.view); }

  /* ---------------------------------------------------------
     7. SELECT BOXES
     --------------------------------------------------------- */
  function fillSelects() {
    var keep = {
      sDept: $('#sDept').value, sSem: $('#sSem').value, cCredit: $('#cCredit').value, cDept: $('#cDept').value,
      mStudent: $('#mStudent').value, mCourse: $('#mCourse').value, mSem: $('#mSem').value, filter: $('#studentDeptFilter').value
    };
    $('#sDept').innerHTML = optionList(DEPTS, keep.sDept);
    $('#sSem').innerHTML = optionList(SEMESTERS, keep.sSem || 1, function (v) { return 'Semester ' + v; });
    $('#cCredit').innerHTML = optionList(CREDITS, keep.cCredit || 3, function (v) { return fmtCredit(v) + ' credit' + (v > 1 ? 's' : ''); });
    $('#cDept').innerHTML = optionList(COURSE_DEPTS, keep.cDept);
    $('#mSem').innerHTML = optionList(SEMESTERS, keep.mSem || 1, function (v) { return 'Semester ' + v; });
    $('#studentDeptFilter').innerHTML = '<option value="">All departments</option>' + optionList(DEPTS, keep.filter);

    var sorted = db.students.slice().sort(function (a, b) { return a.id.localeCompare(b.id); });
    $('#mStudent').innerHTML = '<option value="">Select student...</option>' + sorted.map(function (s) {
      return '<option value="' + esc(s.id) + '"' + (s.id === keep.mStudent ? ' selected' : '') + '>' + esc(s.id + ' - ' + s.name) + '</option>';
    }).join('');
    var courses = db.courses.slice().sort(function (a, b) { return a.code.localeCompare(b.code); });
    $('#mCourse').innerHTML = '<option value="">Select course...</option>' + courses.map(function (c) {
      return '<option value="' + esc(c.code) + '"' + (c.code === keep.mCourse ? ' selected' : '') + '>' + esc(c.code + ' - ' + c.title + ' (' + fmtCredit(c.credit) + ' cr)') + '</option>';
    }).join('');
  }

  /* ---------------------------------------------------------
     8. DASHBOARD
     --------------------------------------------------------- */
  function studentSummaries() {
    return db.students.map(function (s) { return { s: s, g: gpaOf(resultsOf(s.id)) }; });
  }
  function renderDashboard() {
    var sums = studentSummaries();
    var withResults = sums.filter(function (x) { return x.g.count > 0; });
    var avg = withResults.length ? withResults.reduce(function (a, x) { return a + x.g.gpa; }, 0) / withResults.length : 0;
    var passed = withResults.filter(function (x) { return x.g.fails === 0; }).length;
    var rate = withResults.length ? Math.round(passed * 100 / withResults.length) : 0;

    $('#dashStats').innerHTML = [
      { l: 'Students', v: db.students.length, h: 'registered', c: '#23408e' },
      { l: 'Courses', v: db.courses.length, h: 'in catalogue', c: '#0e9f8e' },
      { l: 'Results', v: db.results.length, h: 'marks recorded', c: '#7c3aed' },
      { l: 'Average CGPA', v: withResults.length ? fmt2(avg) : '-', h: withResults.length ? rate + '% students passed all courses' : 'no results yet', c: '#c2410c' }
    ].map(function (x) {
      return '<div class="stat" style="--c:' + x.c + '"><div class="label">' + x.l + '</div><div class="value">' + x.v + '</div><div class="hint">' + x.h + '</div></div>';
    }).join('');

    // grade distribution
    var counts = SCALE.map(function () { return 0; });
    db.results.forEach(function (r) { counts[SCALE.indexOf(gradeOf(r.marks))] += 1; });
    var max = Math.max.apply(null, counts.concat([1]));
    var colors = { 'g-a': '#178a4d', 'g-b': '#1f55b8', 'g-c': '#b7791f', 'g-d': '#d97706', 'g-f': '#c93a3a' };
    $('#gradeChart').innerHTML = SCALE.map(function (g, i) {
      return '<div class="hbar"><span>' + gradeBadge(g) + '</span><div class="track"><div class="fill" style="width:' + (counts[i] * 100 / max) + '%;--c:' + colors[g.cls] + '"></div></div><span class="n">' + counts[i] + '</span></div>';
    }).join('');

    // top performers
    var top = withResults.slice().sort(function (a, b) { return b.g.gpa - a.g.gpa; }).slice(0, 5);
    $('#topList').innerHTML = top.length ? '<ol class="rank-list">' + top.map(function (x, i) {
      return '<li><span class="rank-no">' + (i + 1) + '</span>' + avatar(x.s.name, false, x.s.photo) + '<div class="who"><b>' + esc(x.s.name) + '</b><span>' + esc(x.s.id + ' - ' + x.s.dept) + '</span></div><span class="cg">' + fmt2(x.g.gpa) + '</span></li>';
    }).join('') + '</ol>' : '<div class="empty">No results recorded yet.</div>';

    // department summary
    var rows = DEPTS.map(function (d) {
      var inDept = sums.filter(function (x) { return x.s.dept === d; });
      var wr = inDept.filter(function (x) { return x.g.count > 0; });
      var a = wr.length ? wr.reduce(function (t, x) { return t + x.g.gpa; }, 0) / wr.length : null;
      return '<tr><td>' + esc(d) + '</td><td class="num">' + inDept.length + '</td><td class="num">' + (a === null ? '-' : fmt2(a)) + '</td></tr>';
    }).join('');
    $('#deptSummary').innerHTML = '<table><thead><tr><th>Department</th><th class="num">Students</th><th class="num">Average CGPA</th></tr></thead><tbody>' + rows + '</tbody></table>';

    // grading scale
    $('#scaleTable').innerHTML = '<table><thead><tr><th>Marks</th><th>Grade</th><th class="num">Point</th><th>Remark</th></tr></thead><tbody>' +
      SCALE.map(function (g, i) {
        return '<tr><td>' + RANGES[i] + '</td><td>' + gradeBadge(g) + '</td><td class="num">' + fmt2(g.gp) + '</td><td>' + g.remark + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  /* ---------------------------------------------------------
     9. STUDENTS (register / edit / delete / list)
     --------------------------------------------------------- */
  function nextStudentId() {
    var max = 1000;
    db.students.forEach(function (s) {
      var m = /^STU-(\d+)$/i.exec(s.id);
      if (m) { max = Math.max(max, parseInt(m[1], 10)); }
    });
    return 'STU-' + (max + 1);
  }
  function resetStudentForm() {
    state.editStudent = null;
    var f = $('#studentForm');
    f.reset(); clearErrors(f);
    $('#sId').readOnly = false;
    $('#sId').value = nextStudentId();
    $('#studentFormTitle').textContent = 'Register student';
    $('#studentSubmit').textContent = 'Register student';
    $('#studentCancel').hidden = true;
  }
  function startEditStudent(id) {
    var s = studentById(id);
    if (!s) { return; }
    state.editStudent = id;
    clearErrors($('#studentForm'));
    $('#sId').value = s.id; $('#sId').readOnly = true;
    $('#sName').value = s.name;
    $('#sDept').value = s.dept;
    $('#sSem').value = s.semester;
    $('#sFather').value = s.fatherName || '';
    $('#sMother').value = s.motherName || '';
    $('#sEmail').value = s.email;
    $('#sPhone').value = s.phone || '';
    $('#sDob').value = s.dob || '';
    $('#studentFormTitle').textContent = 'Edit student';
    $('#studentSubmit').textContent = 'Save changes';
    $('#studentCancel').hidden = false;
    $('#sName').focus();
    $('#studentForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function parentError(v) {
    if (!v) { return ''; }
    if (v.length < 2) { return 'Enter the full name.'; }
    if (!/^[A-Za-z\u0980-\u09FF .'-]+$/.test(v)) { return 'Use letters, spaces, . \' and - only.'; }
    return '';
  }
  function submitStudent(e) {
    e.preventDefault();
    var id = $('#sId').value.trim(), name = $('#sName').value.trim().replace(/\s+/g, ' ');
    var email = $('#sEmail').value.trim(), phone = $('#sPhone').value.trim();
    var ok = true;

    if (!id) { ok = setError('sId', 'Student ID is required.') && ok; }
    else if (!/^[A-Za-z0-9-]{3,20}$/.test(id)) { ok = setError('sId', 'Use 3-20 letters, digits or hyphens.') && ok; }
    else if (!state.editStudent && db.students.some(function (s) { return s.id.toLowerCase() === id.toLowerCase(); })) { ok = setError('sId', 'This ID already exists.') && ok; }
    else { setError('sId', ''); }

    if (name.length < 2) { ok = setError('sName', 'Enter the student\'s full name.') && ok; }
    else if (!/^[A-Za-zঀ-৿ .'-]+$/.test(name)) { ok = setError('sName', 'Name can contain letters, spaces, . \' and - only.') && ok; }
    else { setError('sName', ''); }

    if (!email) { ok = setError('sEmail', 'Email is required.') && ok; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { ok = setError('sEmail', 'Enter a valid email address.') && ok; }
    else if (db.students.some(function (s) { return s.email.toLowerCase() === email.toLowerCase() && s.id !== state.editStudent; })) { ok = setError('sEmail', 'This email is already used.') && ok; }
    else { setError('sEmail', ''); }

    if (phone && !/^[0-9+\-\s()]{7,20}$/.test(phone)) { ok = setError('sPhone', 'Enter a valid contact number.') && ok; }
    else { setError('sPhone', ''); }

    var father = $('#sFather').value.trim().replace(/\s+/g, ' '), mother = $('#sMother').value.trim().replace(/\s+/g, ' ');
    ok = setError('sFather', parentError(father)) && ok;
    ok = setError('sMother', parentError(mother)) && ok;

    if (!ok) { return; }

    var base = state.editStudent ? studentById(state.editStudent) : { photo: '' };
    var rec = Object.assign({}, base, { id: id, name: name, dept: $('#sDept').value, semester: parseInt($('#sSem').value, 10), email: email, phone: phone, dob: $('#sDob').value, fatherName: father, motherName: mother });
    if (state.editStudent) {
      var idx = db.students.findIndex(function (s) { return s.id === state.editStudent; });
      db.students[idx] = rec;
      toast('Student updated.');
    } else {
      db.students.push(rec);
      toast('Student registered: ' + name);
    }
    saveDb();
    resetStudentForm();
    refresh();
  }
  function renderStudents() {
    var q = $('#studentSearch').value.trim().toLowerCase();
    var d = $('#studentDeptFilter').value;
    var list = db.students.filter(function (s) {
      return (!d || s.dept === d) && (!q || (s.id + ' ' + s.name + ' ' + s.email).toLowerCase().indexOf(q) !== -1);
    }).sort(function (a, b) { return a.id.localeCompare(b.id); });
    $('#studentCount').textContent = list.length;
    if (!list.length) {
      $('#studentTable').innerHTML = '<div class="empty">No students found.</div>';
      return;
    }
    $('#studentTable').innerHTML = '<table><thead><tr><th>Student</th><th>Department</th><th>Sem</th><th class="num">CGPA</th><th></th></tr></thead><tbody>' +
      list.map(function (s) {
        var g = gpaOf(resultsOf(s.id));
        return '<tr><td><div class="cell-person">' + avatar(s.name, false, s.photo) + '<div><b>' + esc(s.name) + '</b><span>' + esc(s.id) + '</span></div></div></td>' +
          '<td>' + esc(s.dept) + '</td><td>' + s.semester + '</td><td class="num">' + (g.count ? fmt2(g.gpa) : '-') + '</td>' +
          '<td class="row-actions"><button class="btn sm" data-act="profile" data-id="' + esc(s.id) + '">Profile</button>' +
          '<button class="btn sm" data-act="edit" data-id="' + esc(s.id) + '">Edit</button>' +
          '<button class="btn sm del" data-act="delete" data-id="' + esc(s.id) + '">Delete</button></td></tr>';
      }).join('') + '</tbody></table>';
  }
  function deleteStudent(id) {
    var s = studentById(id);
    if (!s) { return; }
    var n = resultsOf(id).length;
    confirmBox('Delete ' + s.name + ' (' + s.id + ')' + (n ? ' and ' + n + ' recorded result' + (n > 1 ? 's' : '') : '') + '? This cannot be undone.').then(function (yes) {
      if (!yes) { return; }
      db.students = db.students.filter(function (x) { return x.id !== id; });
      db.results = db.results.filter(function (r) { return r.studentId !== id; });
      saveDb();
      if (state.editStudent === id) { resetStudentForm(); }
      toast('Student deleted.');
      refresh();
    });
  }

  /* ---------------------------------------------------------
     10. TRANSCRIPT + PROFILE
     --------------------------------------------------------- */
  function transcriptHTML(s) {
    var res = resultsOf(s.id);
    var sum = gpaOf(res);
    var st = statusOf(sum);
    var html = '';

    if (!res.length) {
      return '<div class="card"><div class="empty">No results have been recorded for this student yet.</div></div>';
    }

    html += '<div class="sum-grid">' +
      '<div class="sum"><div class="k">CGPA</div><div class="v">' + fmt2(sum.gpa) + '</div></div>' +
      '<div class="sum"><div class="k">Total credits</div><div class="v">' + fmtCredit(sum.credits) + '</div></div>' +
      '<div class="sum"><div class="k">Courses</div><div class="v">' + sum.count + '</div></div>' +
      '<div class="sum ' + (sum.fails ? 'bad' : 'ok') + '"><div class="k">Result</div><div class="v" style="font-size:1.1rem;margin-top:6px">' + esc(st.text) + '</div></div>' +
      '</div>';

    var sems = [];
    res.forEach(function (r) { if (sems.indexOf(r.semester) === -1) { sems.push(r.semester); } });
    sems.sort(function (a, b) { return a - b; });

    var trend = [];
    var blocks = sems.map(function (sem) {
      var rs = res.filter(function (r) { return r.semester === sem; });
      var g = gpaOf(rs);
      trend.push({ sem: sem, gpa: g.gpa });
      var rows = rs.map(function (r) {
        var c = courseByCode(r.code) || { title: '(course removed)', credit: 0 };
        var gr = gradeOf(r.marks);
        return '<tr><td>' + esc(r.code) + '</td><td>' + esc(c.title) + '</td><td class="num">' + fmtCredit(c.credit) + '</td><td class="num">' + r.marks + '</td><td>' + gradeBadge(gr) + '</td><td class="num">' + fmt2(gr.gp) + '</td></tr>';
      }).join('');
      return '<div class="sem-block"><div class="sem-title"><h3>Semester ' + sem + '</h3><span class="sem-gpa">Credits <b>' + fmtCredit(g.credits) + '</b> &middot; Semester GPA <b>' + fmt2(g.gpa) + '</b></span></div>' +
        '<div class="table-wrap"><table><thead><tr><th>Code</th><th>Course title</th><th class="num">Credit</th><th class="num">Marks</th><th>Grade</th><th class="num">Point</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    }).join('');

    html += '<div class="card" style="margin-top:20px"><h2>Course-wise result</h2>' + blocks +
      '<p class="muted small" style="margin-top:16px">Standing: <b>' + esc(standing(sum.gpa)) + '</b> &middot; GPA = &Sigma;(grade point &times; credit) / &Sigma;credit</p></div>';

    if (trend.length > 1) {
      html += '<div class="card" style="margin-top:20px"><h2>Semester GPA trend</h2><div class="trend">' + trend.map(function (t) {
        return '<div class="col"><span class="val">' + fmt2(t.gpa) + '</span><div class="bar" style="height:' + Math.max(3, t.gpa / 4 * 78) + '%"></div><span>Sem ' + t.sem + '</span></div>';
      }).join('') + '</div></div>';
    }
    return html;
  }

  function studentHeaderHTML(s, withDetails) {
    var sum = gpaOf(resultsOf(s.id));
    var st = statusOf(sum);
    function val(v) { return v ? esc(v) : '<span class="missing">Not added yet</span>'; }
    var h = '<div class="card"><div class="sheet-head">' + avatar(s.name, withDetails ? 'xl' : true, s.photo) +
      '<div class="grow"><h2>' + esc(s.name) + '</h2><div class="meta">' + esc(s.id) + ' &middot; Department of ' + esc(s.dept) + ' &middot; Semester ' + s.semester + '</div>' +
      '<div style="margin-top:8px"><span class="badge ' + st.cls + '">' + esc(st.text) + '</span></div></div>' +
      (withDetails ? '<button type="button" class="btn primary no-print" id="profileEditBtn">Edit profile</button>' : '') + '</div>';
    if (withDetails) {
      h += '<dl class="info-grid">' +
        '<div><dt>Student ID</dt><dd>' + esc(s.id) + '</dd></div>' +
        '<div><dt>Father\'s name</dt><dd>' + val(s.fatherName) + '</dd></div>' +
        '<div><dt>Mother\'s name</dt><dd>' + val(s.motherName) + '</dd></div>' +
        '<div><dt>Contact number</dt><dd>' + val(s.phone) + '</dd></div>' +
        '<div><dt>Email</dt><dd>' + val(s.email) + '</dd></div>' +
        '<div><dt>Date of birth</dt><dd>' + val(s.dob) + '</dd></div>' +
        '<div><dt>Department</dt><dd>' + esc(s.dept) + '</dd></div>' +
        '<div><dt>Current semester</dt><dd>' + s.semester + '</dd></div>' +
        '</dl>';
    }
    return h + '</div>';
  }

  /* ---- profile editing (done by the student) ---- */
  function showPhotoPreview() {
    var s = studentById(state.profileId);
    if (!s) { return; }
    var photo = state.pendingPhoto !== undefined ? state.pendingPhoto : s.photo;
    $('#photoPreview').innerHTML = avatar(s.name, 'xl', photo);
    $('#pPhotoRemove').disabled = !photo;
  }
  function openProfileEdit() {
    var s = studentById(state.profileId);
    if (!s) { return; }
    var f = $('#profileForm');
    clearErrors(f);
    state.pendingPhoto = undefined;
    $('#pFather').value = s.fatherName || '';
    $('#pMother').value = s.motherName || '';
    $('#pPhone').value = s.phone || '';
    $('#pEmail').value = s.email || '';
    $('#pPhoto').value = '';
    showPhotoPreview();
    $('#profileFormCard').hidden = false;
    $('#profileFormCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function closeProfileEdit() {
    state.pendingPhoto = undefined;
    $('#profileFormCard').hidden = true;
  }
  // Reads the chosen image, crops it to a square and shrinks it to 256 x 256 px
  function processPhoto(file, done) {
    if (!/^image\//.test(file.type)) { done('Please choose an image file (JPG or PNG).'); return; }
    if (file.size > 5 * 1024 * 1024) { done('The image is larger than 5 MB.'); return; }
    var reader = new FileReader();
    reader.onerror = function () { done('The image could not be read.'); };
    reader.onload = function () {
      var img = new Image();
      img.onerror = function () { done('This image could not be opened.'); };
      img.onload = function () {
        var size = 256, side = Math.min(img.width, img.height);
        var canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        done(null, canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
  function submitProfile(e) {
    e.preventDefault();
    var s = studentById(state.profileId);
    if (!s) { return; }
    var father = $('#pFather').value.trim().replace(/\s+/g, ' '), mother = $('#pMother').value.trim().replace(/\s+/g, ' ');
    var phone = $('#pPhone').value.trim(), email = $('#pEmail').value.trim();
    var ok = true;
    ok = setError('pFather', parentError(father)) && ok;
    ok = setError('pMother', parentError(mother)) && ok;
    if (phone && !/^[0-9+\-\s()]{7,20}$/.test(phone)) { ok = setError('pPhone', 'Enter a valid contact number.') && ok; } else { setError('pPhone', ''); }
    if (!email) { ok = setError('pEmail', 'Email is required.') && ok; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { ok = setError('pEmail', 'Enter a valid email address.') && ok; }
    else if (db.students.some(function (x) { return x.email.toLowerCase() === email.toLowerCase() && x.id !== s.id; })) { ok = setError('pEmail', 'This email is already used by another student.') && ok; }
    else { setError('pEmail', ''); }
    if (!ok) { return; }

    s.fatherName = father; s.motherName = mother; s.phone = phone; s.email = email;
    if (state.pendingPhoto !== undefined) { s.photo = state.pendingPhoto; }
    saveDb();
    closeProfileEdit();
    toast('Profile saved.');
    refresh();
  }

  function renderProfile() {
    var sorted = db.students.slice().sort(function (a, b) { return a.id.localeCompare(b.id); });
    if (!sorted.length) {
      $('#profilePicker').hidden = true;
      $('#profileBody').innerHTML = '<div class="card"><div class="empty">No students registered yet. Add one in the Students section.</div></div>';
      return;
    }
    if (!studentById(state.profileId)) { state.profileId = sorted[0].id; }
    $('#profilePicker').hidden = false;
    $('#profileSelect').innerHTML = sorted.map(function (x) {
      return '<option value="' + esc(x.id) + '"' + (x.id === state.profileId ? ' selected' : '') + '>' + esc(x.id + ' - ' + x.name) + '</option>';
    }).join('');
    var s = studentById(state.profileId);
    $('#profileBody').innerHTML = '<div class="stack">' + studentHeaderHTML(s, true) + '<div>' + transcriptHTML(s) + '</div></div>';
  }

  /* ---------------------------------------------------------
     11. COURSES
     --------------------------------------------------------- */
  function resetCourseForm() {
    state.editCourse = null;
    var f = $('#courseForm');
    f.reset(); clearErrors(f);
    $('#cCode').readOnly = false;
    $('#cCredit').value = 3;
    $('#courseFormTitle').textContent = 'Add course';
    $('#courseSubmit').textContent = 'Add course';
    $('#courseCancel').hidden = true;
  }
  function startEditCourse(code) {
    var c = courseByCode(code);
    if (!c) { return; }
    state.editCourse = code;
    clearErrors($('#courseForm'));
    $('#cCode').value = c.code; $('#cCode').readOnly = true;
    $('#cTitle').value = c.title;
    $('#cCredit').value = c.credit;
    $('#cDept').value = c.dept;
    $('#courseFormTitle').textContent = 'Edit course';
    $('#courseSubmit').textContent = 'Save changes';
    $('#courseCancel').hidden = false;
    $('#cTitle').focus();
    $('#courseForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function submitCourse(e) {
    e.preventDefault();
    var code = $('#cCode').value.trim().toUpperCase().replace(/\s+/g, '');
    var title = $('#cTitle').value.trim().replace(/\s+/g, ' ');
    var ok = true;
    if (!code) { ok = setError('cCode', 'Course code is required.') && ok; }
    else if (!/^[A-Z0-9-]{3,12}$/.test(code)) { ok = setError('cCode', 'Use 3-12 letters or digits, e.g. CSE301.') && ok; }
    else if (!state.editCourse && courseByCode(code)) { ok = setError('cCode', 'This course code already exists.') && ok; }
    else { setError('cCode', ''); }
    if (title.length < 3) { ok = setError('cTitle', 'Enter the course title.') && ok; } else { setError('cTitle', ''); }
    if (!ok) { return; }

    var rec = { code: code, title: title, credit: parseFloat($('#cCredit').value), dept: $('#cDept').value };
    if (state.editCourse) {
      var idx = db.courses.findIndex(function (c) { return c.code === state.editCourse; });
      db.courses[idx] = rec;
      toast('Course updated. GPAs were recalculated.');
    } else {
      db.courses.push(rec);
      toast('Course added: ' + code);
    }
    saveDb();
    resetCourseForm();
    refresh();
  }
  function renderCourses() {
    var q = $('#courseSearch').value.trim().toLowerCase();
    var list = db.courses.filter(function (c) { return !q || (c.code + ' ' + c.title).toLowerCase().indexOf(q) !== -1; })
      .sort(function (a, b) { return a.code.localeCompare(b.code); });
    $('#courseCount').textContent = list.length;
    if (!list.length) { $('#courseTable').innerHTML = '<div class="empty">No courses found.</div>'; return; }
    $('#courseTable').innerHTML = '<table><thead><tr><th>Code</th><th>Title</th><th class="num">Credit</th><th>Offered by</th><th class="num">Results</th><th></th></tr></thead><tbody>' +
      list.map(function (c) {
        var n = db.results.filter(function (r) { return r.code === c.code; }).length;
        return '<tr><td><b>' + esc(c.code) + '</b></td><td>' + esc(c.title) + '</td><td class="num">' + fmtCredit(c.credit) + '</td><td>' + esc(c.dept) + '</td><td class="num">' + n + '</td>' +
          '<td class="row-actions"><button class="btn sm" data-act="edit" data-code="' + esc(c.code) + '">Edit</button>' +
          '<button class="btn sm del" data-act="delete" data-code="' + esc(c.code) + '">Delete</button></td></tr>';
      }).join('') + '</tbody></table>';
  }
  function deleteCourse(code) {
    var c = courseByCode(code);
    if (!c) { return; }
    var n = db.results.filter(function (r) { return r.code === code; }).length;
    confirmBox('Delete course ' + code + ' - ' + c.title + (n ? ' and its ' + n + ' recorded result' + (n > 1 ? 's' : '') : '') + '?').then(function (yes) {
      if (!yes) { return; }
      db.courses = db.courses.filter(function (x) { return x.code !== code; });
      db.results = db.results.filter(function (r) { return r.code !== code; });
      saveDb();
      if (state.editCourse === code) { resetCourseForm(); }
      toast('Course deleted.');
      refresh();
    });
  }

  /* ---------------------------------------------------------
     12. MARKS ENTRY
     --------------------------------------------------------- */
  function updateMarkPreview() {
    var raw = $('#mMarks').value;
    var box = $('#markPreview');
    if (raw === '' || isNaN(parseFloat(raw))) { box.innerHTML = '<span class="muted">Enter marks to preview the grade.</span>'; return; }
    var m = parseFloat(raw);
    if (m < 0 || m > 100) { box.innerHTML = '<span style="color:var(--danger)">Marks must be between 0 and 100.</span>'; return; }
    var g = gradeOf(m);
    box.innerHTML = gradeBadge(g) + '<span>Grade point <b>' + fmt2(g.gp) + '</b></span><span class="muted">&middot; ' + g.remark + '</span>';
  }
  function resetMarkForm() {
    state.editMark = null;
    var f = $('#markForm');
    f.reset(); clearErrors(f);
    $('#mStudent').disabled = false; $('#mCourse').disabled = false;
    $('#markFormTitle').textContent = 'Enter marks';
    $('#markSubmit').textContent = 'Save result';
    $('#markCancel').hidden = true;
    fillSelects();
    updateMarkPreview();
  }
  function startEditMark(sid, code) {
    var r = db.results.filter(function (x) { return x.studentId === sid && x.code === code; })[0];
    if (!r) { return; }
    state.editMark = { sid: sid, code: code };
    clearErrors($('#markForm'));
    $('#mStudent').value = sid; $('#mCourse').value = code;
    $('#mStudent').disabled = true; $('#mCourse').disabled = true;
    $('#mSem').value = r.semester;
    $('#mMarks').value = r.marks;
    $('#markFormTitle').textContent = 'Edit result';
    $('#markSubmit').textContent = 'Save changes';
    $('#markCancel').hidden = false;
    updateMarkPreview();
    $('#mMarks').focus();
    $('#markForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function submitMark(e) {
    e.preventDefault();
    var sid = $('#mStudent').value, code = $('#mCourse').value, raw = $('#mMarks').value.trim();
    var ok = true;
    if (!sid) { ok = setError('mStudent', 'Select a student.') && ok; } else { setError('mStudent', ''); }
    if (!code) { ok = setError('mCourse', 'Select a course.') && ok; } else { setError('mCourse', ''); }
    var m = parseFloat(raw);
    if (raw === '' || isNaN(m)) { ok = setError('mMarks', 'Enter the marks.') && ok; }
    else if (m < 0 || m > 100) { ok = setError('mMarks', 'Marks must be between 0 and 100.') && ok; }
    else { setError('mMarks', ''); }
    if (!ok) { return; }

    var sem = parseInt($('#mSem').value, 10);
    var existing = db.results.filter(function (r) { return r.studentId === sid && r.code === code; })[0];
    if (existing) {
      existing.marks = m; existing.semester = sem;
      toast(state.editMark ? 'Result updated.' : 'Existing result updated (one result per student and course).');
    } else {
      db.results.push({ studentId: sid, code: code, semester: sem, marks: m });
      var g = gradeOf(m), s = studentById(sid);
      toast('Saved: ' + s.name + ' - ' + code + ' = ' + g.grade + ' (' + fmt2(g.gp) + ')');
    }
    saveDb();
    var keepStudent = sid, keepSem = $('#mSem').value;
    resetMarkForm(); // then keep student and semester selected for fast entry of many courses
    $('#mStudent').value = keepStudent; $('#mSem').value = keepSem;
    renderMarks();
    $('#mCourse').focus();
  }
  function renderMarks() {
    var q = $('#markSearch').value.trim().toLowerCase();
    var rows = db.results.map(function (r, i) { return { r: r, i: i, s: studentById(r.studentId), c: courseByCode(r.code) }; })
      .filter(function (x) { return x.s && x.c; })
      .filter(function (x) { return !q || (x.s.id + ' ' + x.s.name + ' ' + x.c.code + ' ' + x.c.title).toLowerCase().indexOf(q) !== -1; })
      .reverse();
    $('#markCount').textContent = rows.length;
    if (!rows.length) { $('#markTable').innerHTML = '<div class="empty">No results found.</div>'; return; }
    $('#markTable').innerHTML = '<table><thead><tr><th>Student</th><th>Course</th><th class="num">Sem</th><th class="num">Marks</th><th>Grade</th><th class="num">Point</th><th></th></tr></thead><tbody>' +
      rows.slice(0, 200).map(function (x) {
        var g = gradeOf(x.r.marks);
        return '<tr><td><div class="cell-person"><div><b>' + esc(x.s.name) + '</b><span>' + esc(x.s.id) + '</span></div></div></td>' +
          '<td title="' + esc(x.c.title) + '"><b>' + esc(x.c.code) + '</b></td><td class="num">' + x.r.semester + '</td>' +
          '<td class="num">' + x.r.marks + '</td><td>' + gradeBadge(g) + '</td><td class="num">' + fmt2(g.gp) + '</td>' +
          '<td class="row-actions"><button class="btn sm" data-act="edit" data-sid="' + esc(x.r.studentId) + '" data-code="' + esc(x.r.code) + '">Edit</button>' +
          '<button class="btn sm del" data-act="delete" data-sid="' + esc(x.r.studentId) + '" data-code="' + esc(x.r.code) + '">Delete</button></td></tr>';
      }).join('') + '</tbody></table>';
  }
  function deleteMark(sid, code) {
    var s = studentById(sid);
    confirmBox('Delete the result of ' + (s ? s.name : sid) + ' in ' + code + '?').then(function (yes) {
      if (!yes) { return; }
      db.results = db.results.filter(function (r) { return !(r.studentId === sid && r.code === code); });
      saveDb();
      if (state.editMark && state.editMark.sid === sid && state.editMark.code === code) { resetMarkForm(); }
      toast('Result deleted.');
      refresh();
    });
  }

  /* ---------------------------------------------------------
     13. RESULT SEARCH
     --------------------------------------------------------- */
  function renderSearch() {
    var q = $('#rsQuery').value.trim().toLowerCase();
    var matchesBox = $('#rsMatches'), out = $('#rsResult'), printBtn = $('#searchPrint');
    printBtn.hidden = true; $('#searchProfile').hidden = true;
    if (!q) {
      matchesBox.innerHTML = '<span class="muted small">Tip: try <b>STU-1001</b>, <b>Nusrat</b> or just a part of a name.</span>';
      out.innerHTML = '';
      return;
    }
    var matches = db.students.filter(function (s) { return (s.id + ' ' + s.name).toLowerCase().indexOf(q) !== -1; });
    if (!matches.length) {
      matchesBox.innerHTML = '';
      out.innerHTML = '<div class="card"><div class="empty">No student found for &ldquo;' + esc($('#rsQuery').value.trim()) + '&rdquo;.</div></div>';
      return;
    }
    var exact = matches.filter(function (s) { return s.id.toLowerCase() === q; })[0];
    var pick = (state.searchPick && studentById(state.searchPick)) ? studentById(state.searchPick) : (exact || (matches.length === 1 ? matches[0] : null));

    if (matches.length > 1) {
      matchesBox.innerHTML = '<span class="muted small" style="align-self:center">' + matches.length + ' students match:</span>' + matches.map(function (s) {
        return '<button type="button" class="chip" data-pick="' + esc(s.id) + '">' + esc(s.name) + ' (' + esc(s.id) + ')</button>';
      }).join('');
    } else { matchesBox.innerHTML = ''; }

    if (!pick) {
      out.innerHTML = '<div class="card"><div class="empty">Select one of the matching students above to view the result.</div></div>';
      return;
    }
    printBtn.hidden = false;
    $('#searchProfile').hidden = false;
    state.searchCurrent = pick.id;
    out.innerHTML = '<div class="stack">' + studentHeaderHTML(pick, false) + '<div>' + transcriptHTML(pick) + '</div></div>';
  }

  /* ---------------------------------------------------------
     14. EVENTS
     --------------------------------------------------------- */
  function printPage() { try { window.print(); } catch (e) { toast('Printing is not available here.', true); } }

  function bindEvents() {
    $('#nav').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-view]');
      if (b) { showView(b.getAttribute('data-view')); }
    });

    // students
    $('#studentForm').addEventListener('submit', submitStudent);
    $('#studentCancel').addEventListener('click', resetStudentForm);
    $('#studentSearch').addEventListener('input', renderStudents);
    $('#studentDeptFilter').addEventListener('change', renderStudents);
    $('#studentTable').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act]');
      if (!b) { return; }
      var id = b.getAttribute('data-id'), act = b.getAttribute('data-act');
      if (act === 'profile') { showView('profile', id); }
      else if (act === 'edit') { startEditStudent(id); }
      else if (act === 'delete') { deleteStudent(id); }
    });
    $('#profileBack').addEventListener('click', function () { showView('students'); });
    $('#profilePrint').addEventListener('click', printPage);
    $('#profileSelect').addEventListener('change', function () { state.profileId = this.value; closeProfileEdit(); renderProfile(); });
    $('#profileBody').addEventListener('click', function (e) { if (e.target.closest('#profileEditBtn')) { openProfileEdit(); } });
    $('#profileForm').addEventListener('submit', submitProfile);
    $('#profileCancel').addEventListener('click', closeProfileEdit);
    $('#pPhotoBtn').addEventListener('click', function () { $('#pPhoto').click(); });
    $('#pPhotoRemove').addEventListener('click', function () { state.pendingPhoto = ''; $('#pPhoto').value = ''; setError('pPhoto', ''); showPhotoPreview(); });
    $('#pPhoto').addEventListener('change', function () {
      var file = this.files && this.files[0];
      if (!file) { return; }
      processPhoto(file, function (err, data) {
        if (err) { setError('pPhoto', err); return; }
        setError('pPhoto', '');
        state.pendingPhoto = data;
        showPhotoPreview();
      });
    });
    $('#searchProfile').addEventListener('click', function () { if (state.searchCurrent) { showView('profile', state.searchCurrent); } });

    // courses
    $('#courseForm').addEventListener('submit', submitCourse);
    $('#courseCancel').addEventListener('click', resetCourseForm);
    $('#courseSearch').addEventListener('input', renderCourses);
    $('#cCode').addEventListener('input', function () { this.value = this.value.toUpperCase(); });
    $('#courseTable').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act]');
      if (!b) { return; }
      var code = b.getAttribute('data-code');
      if (b.getAttribute('data-act') === 'edit') { startEditCourse(code); } else { deleteCourse(code); }
    });

    // marks
    $('#markForm').addEventListener('submit', submitMark);
    $('#markCancel').addEventListener('click', resetMarkForm);
    $('#mMarks').addEventListener('input', updateMarkPreview);
    $('#markSearch').addEventListener('input', renderMarks);
    $('#markTable').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act]');
      if (!b) { return; }
      var sid = b.getAttribute('data-sid'), code = b.getAttribute('data-code');
      if (b.getAttribute('data-act') === 'edit') { startEditMark(sid, code); } else { deleteMark(sid, code); }
    });

    // search
    $('#rsQuery').addEventListener('input', function () { state.searchPick = null; renderSearch(); });
    $('#rsQuery').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); renderSearch(); } });
    $('#rsGo').addEventListener('click', renderSearch);
    $('#rsMatches').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-pick]');
      if (b) { state.searchPick = b.getAttribute('data-pick'); renderSearch(); }
    });
    $('#searchPrint').addEventListener('click', printPage);

    // confirm dialog
    $('#confirmYes').addEventListener('click', function () { closeConfirm(true); });
    $('#confirmNo').addEventListener('click', function () { closeConfirm(false); });
    $('#confirmOverlay').addEventListener('click', function (e) { if (e.target === this) { closeConfirm(false); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#confirmOverlay').hidden) { closeConfirm(false); } });

    // reset sample data
    $('#btnReset').addEventListener('click', function () {
      confirmBox('Replace all current data with the original sample data?', 'Reset').then(function (yes) {
        if (!yes) { return; }
        db = sampleData();
        saveDb();
        resetStudentForm(); resetCourseForm(); resetMarkForm();
        state.searchPick = null;
        toast('Sample data restored.');
        showView('dashboard');
      });
    });
  }

  /* ---------------------------------------------------------
     15. START
     --------------------------------------------------------- */
  function init() {
    loadDb();
    updateStorageNote();
    fillSelects();
    bindEvents();
    resetStudentForm();
    resetCourseForm();
    updateMarkPreview();
    showView('dashboard');
  }
  init();
})();
