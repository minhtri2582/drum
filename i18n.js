/**
 * i18n - Tiếng Việt (default) & English
 */
const LANG_STORAGE_KEY = 'drum-lang';

const translations = {
  vi: {
    // Page
    pageTitle: 'Trống điện tử online - Drum Machine',
    guide: 'Hướng dẫn',
    currentPresetEmpty: 'Chưa chọn điệu',
    currentPresetLabel: 'Điệu đang dùng: ',

    // Auth
    loginGoogle: 'Đăng nhập Google',
    loginTooltip: 'Đăng nhập để có thể tạo điệu trống cho riêng mình và chia sẻ với người khác',
    logout: 'Đăng xuất',

    // Controls
    play: 'Phát',
    bpm: 'BPM',
    timeSig: 'Nhịp',
    metronome: 'Click',
    soundSet: 'Bộ tiếng',
    rhythmPresets: 'Điệu mẫu',
    chain: 'Chuỗi điệu',
    chainTitle: 'Chuỗi điệu',
    chainDescription: 'Chọn thứ tự preset để phát liên tiếp. Nhập số ô nhịp cho mỗi preset.',
    chainMeasures: 'Ô nhịp',
    chainAdd: 'Thêm preset',
    chainSelectPreset: '-- Chọn preset --',
    chainSourceDefault: 'Điệu mặc định',
    chainSourceMine: 'Điệu của tôi',
    chainSourceShared: 'Điệu share',
    chainClear: 'Xoá chuỗi',
    random: 'Ngẫu nhiên',
    masterVolume: 'Âm lượng tổng',
    accentLevel: 'Nhấn mạnh',
    swingAmount: 'Độ lệch nhịp',
    myPresets: 'Điệu của tôi',
    clear: 'Xoá',
    copyLink: 'Share link',
    download: 'Tải xuống',
    downloadFormatChoose: 'Chọn định dạng tải xuống',
    downloadFormatYaml: 'YAML',
    downloadFormatMidi: 'MIDI',
    loadFile: 'Tải lên',
    loadFileNoPresets: 'File không chứa preset hợp lệ.',
    loadFileError: 'Không đọc được file',
    copySuccess: 'Đã sao chép!',
    copyError: 'Lỗi sao chép',

    // My Presets modal
    myPresetsTitle: 'Điệu của tôi',
    tabMine: 'Của tôi',
    tabFavourite: 'Favourite',
    tabShared: 'Share',
    emptyFavourite: 'Chưa có điệu yêu thích. Nhấn ⭐ trên điệu để thêm.',
    favourite: 'Yêu thích',
    unfavourite: 'Bỏ yêu thích',
    like: 'Thích',
    unlike: 'Bỏ thích',
    searchPresets: 'Tìm điệu...',
    sortNameAsc: 'Tên A-Z',
    sortNameDesc: 'Tên Z-A',
    sortNewest: 'Mới',
    sortNewestTitle: 'Cập nhật gần nhất',
    sortOldest: 'Cũ',
    sortOldestTitle: 'Cập nhật cũ nhất',
    add: 'Thêm',
    share: 'Share',
    shareSelectPresets: 'Chọn điệu để share',
    close: 'Đóng',
    selectAll: 'Chọn tất cả',
    colNameUser: 'Tên · User',
    openPlay: 'Mở / Phát',
    edit: 'Sửa',
    delete: 'Xóa',
    emptyMine: 'Chưa có điệu nào. Nhấn Thêm để lưu nhịp hiện tại.',
    emptyShared: 'Chưa có điệu nào được share với bạn.',
    notFound: 'Không tìm thấy điệu',

    // Share modal
    shareTitle: 'Share điệu',
    shareAllUsers: 'Tất cả user',
    shareSelectUser: 'Chọn user',
    searchUser: 'Tìm user theo email hoặc tên...',
    noUsers: 'Không tìm thấy user',
    typeToSearch: 'Gõ 2 ký tự trở lên để tìm user',
    cancel: 'Hủy',
    shareConfirmAll: 'Điệu sẽ hiển thị cho tất cả user. Tiếp tục?',
    shareSuccessAll: 'Đã share {n} điệu cho tất cả user.',
    shareSuccessTitle: 'Share thành công',
    shareConfirmUser: 'Share {n} điệu với {name}?',
    shareSuccessUser: 'Đã share {n} điệu.',
    shareSelectUserFirst: 'Vui lòng chọn user để share.',
    confirmShare: 'Xác nhận Share',

    // Dialog
    alertTitle: 'Thông báo',
    confirmTitle: 'Xác nhận',
    confirm: 'Xác nhận',
    ok: 'OK',
    addPreset: 'Thêm điệu',
    presetName: 'Tên nhịp điệu',
    newPreset: 'Nhịp mới',
    editPreset: 'Lưu đè',
    newName: 'Đổi tên:',
    editConfirm: 'Điệu sẽ chép đè với score hiện tại. Bạn có muốn tiếp tục không?',
    continue: 'Tiếp tục',
    deleteConfirm: 'Xóa điệu "{name}"?',
    deleteTitle: 'Xác nhận xóa',
    downloadTitle: 'Tải xuống',

    // Rhythm modal
    rhythmTitle: 'Chọn nhịp điệu mẫu',
    searchRhythm: 'Tìm nhịp điệu...',
    noRhythm: 'Không tìm thấy nhịp điệu',

    // Errors
    error: 'Lỗi',
    errorConnection: 'Lỗi kết nối',
    loading: 'Đang tải...',

    // Instruments
    hihatPedal: 'Bàn đạp hi-hat',
    tom: 'Tom-tom',
    floorTom: 'Chân tom sàn',
    cymbal: 'Crash',
    ride: 'Ride',
    cowbell: 'Cowbell',
    hihat: 'Hi-hat',
    snare: 'Trống snare',
    kick: 'Trống bass',
    hihatOpen: 'Hi-hat mở (nhấp để đổi)',
    snareRimshot: 'Snare rimshot (nhấp để đổi)',
    tomLow: 'Tom thấp (nhấp để đổi)',
    ghostNote: 'Tiếng nhẹ (nhấp để đổi)',
    volume: 'Vol',

    tupletTitle: 'Tuplet cho step',
    tupletNormal: 'Bình thường',
    tuplet2: 'Liên 2',
    tuplet3: 'Liên 3',
    tuplet4: 'Liên 4',
    tuplet5: 'Liên 5',
    tuplet6: 'Liên 6',
    tupletStep: 'Liên {n} (nhấp chuột phải để sửa)',
    tupletHits: 'Hits:',
    tupletApply: 'Áp dụng',
    tupletClear: 'Xoá tuplet',
  },
  en: {
    pageTitle: 'Online Drum Machine',
    guide: 'Guide',
    currentPresetEmpty: 'No preset selected',
    currentPresetLabel: 'Current preset: ',

    loginGoogle: 'Login with Google',
    loginTooltip: 'Login to create your own drum patterns and share with others',
    logout: 'Logout',

    play: 'Play',
    bpm: 'BPM',
    timeSig: 'Beat',
    metronome: 'Click',
    soundSet: 'Sound',
    volume: 'Vol',
    rhythmPresets: 'Presets',
    chain: 'Chain',
    chainTitle: 'Chain presets',
    chainDescription: 'Select preset order to play sequentially. Enter measures per preset.',
    chainMeasures: 'Measures',
    chainAdd: 'Add preset',
    chainSelectPreset: '-- Select preset --',
    chainSourceDefault: 'Default presets',
    chainSourceMine: 'My presets',
    chainSourceShared: 'Shared presets',
    chainClear: 'Clear chain',
    random: 'Random',
    masterVolume: 'Master Vol',
    accentLevel: 'Accent',
    swingAmount: 'Swing',
    myPresets: 'My Presets',
    clear: 'Clear',
    copyLink: 'Share link',
    download: 'Download',
    downloadFormatChoose: 'Choose download format',
    downloadFormatYaml: 'YAML',
    downloadFormatMidi: 'MIDI',
    loadFile: 'Upload',
    loadFileNoPresets: 'File does not contain valid preset(s).',
    loadFileError: 'Failed to read file',
    copySuccess: 'Copied!',
    copyError: 'Copy failed',

    myPresetsTitle: 'My Presets',
    tabMine: 'Mine',
    tabFavourite: 'Favourite',
    tabShared: 'Shared',
    emptyFavourite: 'No favourites yet. Click ⭐ on a preset to add.',
    favourite: 'Favourite',
    unfavourite: 'Unfavourite',
    like: 'Like',
    unlike: 'Unlike',
    searchPresets: 'Search presets...',
    sortNameAsc: 'Name A-Z',
    sortNameDesc: 'Name Z-A',
    sortNewest: 'Newest',
    sortNewestTitle: 'Newest first',
    sortOldest: 'Oldest',
    sortOldestTitle: 'Oldest first',
    add: 'Add',
    share: 'Share',
    shareSelectPresets: 'Select presets to share',
    close: 'Close',
    selectAll: 'Select all',
    colNameUser: 'Name · User',
    openPlay: 'Open / Play',
    edit: 'Edit',
    delete: 'Delete',
    emptyMine: 'No presets yet. Click Add to save current pattern.',
    emptyShared: 'No presets shared with you yet.',
    notFound: 'No presets found',

    shareTitle: 'Share presets',
    shareAllUsers: 'All users',
    shareSelectUser: 'Select user',
    searchUser: 'Search user by email or name...',
    noUsers: 'No users found',
    typeToSearch: 'Type 2+ characters to search',
    cancel: 'Cancel',
    shareConfirmAll: 'Presets will be visible to all users. Continue?',
    shareSuccessAll: 'Shared {n} presets with all users.',
    shareConfirmUser: 'Share {n} presets with {name}?',
    shareSuccessUser: 'Shared {n} presets.',
    shareSuccessTitle: 'Share successful',
    shareSelectUserFirst: 'Please select a user to share with.',
    confirmShare: 'Confirm Share',

    alertTitle: 'Notice',
    confirmTitle: 'Confirm',
    confirm: 'Confirm',
    ok: 'OK',
    addPreset: 'Add preset',
    presetName: 'Preset name',
    newPreset: 'New preset',
    editPreset: 'Edit preset name',
    newName: 'New name:',
    editConfirm: 'Preset will overwrite current score. Continue?',
    continue: 'Continue',
    deleteConfirm: 'Delete preset "{name}"?',
    deleteTitle: 'Confirm delete',
    downloadTitle: 'Download',

    rhythmTitle: 'Choose preset',
    searchRhythm: 'Search presets...',
    noRhythm: 'No presets found',

    error: 'Error',
    errorConnection: 'Connection error',
    loading: 'Loading...',

    hihatPedal: 'Hi-hat pedal',
    tom: 'Tom-tom',
    floorTom: 'Floor tom',
    cymbal: 'Crash',
    ride: 'Ride',
    cowbell: 'Cowbell',
    hihat: 'Hi-hat',
    snare: 'Snare',
    kick: 'Kick',
    hihatOpen: 'Open hi-hat (click to change)',
    snareRimshot: 'Snare rimshot (click to change)',
    tomLow: 'Low tom (click to change)',
    ghostNote: 'Ghost note (click to change)',

    tupletTitle: 'Tuplet for step',
    tupletNormal: 'Normal',
    tuplet2: 'Tuplet 2',
    tuplet3: 'Tuplet 3',
    tuplet4: 'Tuplet 4',
    tuplet5: 'Tuplet 5',
    tuplet6: 'Tuplet 6',
    tupletStep: 'Tuplet {n} (right-click to edit)',
    tupletHits: 'Hits:',
    tupletApply: 'Apply',
    tupletClear: 'Clear tuplet',
  },
};

let currentLang = localStorage.getItem(LANG_STORAGE_KEY) || 'vi';

function t(key, params = {}) {
  const str = translations[currentLang]?.[key] ?? translations.vi[key] ?? key;
  return str.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? '');
}

function setLanguage(lang) {
  if (translations[lang]) {
    currentLang = lang;
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    document.documentElement.lang = lang === 'vi' ? 'vi' : 'en';
    applyTranslations();
    return true;
  }
  return false;
}

function getLanguage() {
  return currentLang;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      if (el.dataset.i18nPlaceholder) return;
      if (el.type === 'submit' || el.type === 'button') el.value = val;
      else if (el.placeholder !== undefined) el.placeholder = val;
    } else {
      el.textContent = val;
    }
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
  document.querySelectorAll('[data-i18n-empty]').forEach(el => {
    el.dataset.empty = t(el.dataset.i18nEmpty);
  });
  document.querySelectorAll('[data-i18n-before]').forEach(el => {
    el.dataset.presetLabel = t(el.dataset.i18nBefore);
  });
  if (typeof window.onLanguageChange === 'function') {
    window.onLanguageChange(currentLang);
  }
}

function initI18n() {
  document.documentElement.lang = currentLang === 'vi' ? 'vi' : 'en';
  applyTranslations();
  document.title = t('pageTitle');
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
    btn.onclick = () => {
      if (setLanguage(btn.dataset.lang)) {
        document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === currentLang));
        document.title = t('pageTitle');
      }
    };
  });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initI18n);
} else {
  initI18n();
}
