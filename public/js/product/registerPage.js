class RegisterPage {
  constructor() {
    this.form = document.getElementById('registerForm');
    this.submitButton = document.getElementById('registerSubmitBtn');

    if (!this.form) return;

    this.form.addEventListener('submit', (event) => this.handleSubmit(event));
  }

  collectPayload() {
    const formData = new FormData(this.form);
    return {
      item: (formData.get('item') || '').toString().trim(),
      specification: (formData.get('spec') || '').toString().trim(),
      power: (formData.get('power') || '').toString().trim(),
      management_ip: (formData.get('mgmt_ip') || '').toString().trim(),
      username_password: (formData.get('cred') || '').toString().trim(),
      wifi_ssid_5g: (formData.get('ssid_5g') || '').toString().trim(),
      wifi_ssid_24g: (formData.get('ssid_24g') || '').toString().trim(),
      wifi_key: (formData.get('wifi_key') || '').toString().trim(),
      mac: (formData.get('mac') || '').toString().trim(),
      pon_sn: (formData.get('pon_sn') || '').toString().trim(),
      sn: (formData.get('sn') || '').toString().trim(),
    };
  }

  async handleSubmit(event) {
    event.preventDefault();

    if (this.submitButton) {
      this.submitButton.disabled = true;
    }

    try {
      const payload = this.collectPayload();
      const response = await fetch('/register/json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 201) {
        window.location.href = '/register/success';
        return;
      }

      if (response.status === 204) {
        return;
      }

      if (response.status === 409) {
        alert('Warning: Duplicate product with matching MAC, PON S/N, or S/N already exists.');
        return;
      }

      alert('Failed to save product.');
    } catch (error) {
      alert('Failed to save product.');
    } finally {
      if (this.submitButton) {
        this.submitButton.disabled = false;
      }
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new RegisterPage());
} else {
  new RegisterPage();
}
