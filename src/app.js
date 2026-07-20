// src/app.js
(function () {
  'use strict';
  function showScreen(name) {
    for (const n of ['menu', 'quiz', 'result']) {
      document.getElementById('screen-' + n).classList.toggle('hidden', n !== name);
    }
  }
  window.APP = { showScreen };
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('menu-body').textContent = 'メニュー準備中…';
    showScreen('menu');
  });
})();
