class NotificationPage {
  constructor() {
    this.backButton = document.getElementById('backButton');
    if (!this.backButton) return;
    this.backButton.addEventListener('click', () => window.history.back());
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new NotificationPage());
} else {
  new NotificationPage();
}
