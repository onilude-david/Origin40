'use strict';

var form = document.getElementById('onboardingForm');
var headshotData = '';
var summary = document.getElementById('ventureSummary');

summary.addEventListener('input', function () {
  document.getElementById('count').textContent = summary.value.length + ' / 240';
});

document.getElementById('headshot').addEventListener('change', function () {
  var file = this.files && this.files[0];
  setError('headshot', '');
  if (!file) return;
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    setError('headshot', 'Please choose a JPG, PNG, or WebP image.');
    this.value = '';
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    setError('headshot', 'Please choose an image smaller than 2 MB.');
    this.value = '';
    return;
  }
  var reader = new FileReader();
  reader.onload = function () {
    headshotData = reader.result;
    document.getElementById('preview').src = headshotData;
    document.getElementById('preview').classList.add('show');
    document.getElementById('fileLabel').textContent = file.name;
  };
  reader.readAsDataURL(file);
});

function setError(name, message) {
  var target = document.querySelector('[data-error="' + name + '"]');
  var input = document.getElementById(name);
  if (target) target.textContent = message;
  if (input) input.setAttribute('aria-invalid', message ? 'true' : 'false');
}

function validate() {
  var valid = true;
  ['name', 'email', 'venture', 'ventureSummary', 'discord'].forEach(function (name) {
    var input = document.getElementById(name);
    var message = input.value.trim() ? '' : 'This field is required.';
    if (name === 'email' && input.value && !input.validity.valid) message = 'Enter a valid email address.';
    setError(name, message);
    if (message) valid = false;
  });
  ['availability', 'mediaConsent'].forEach(function (name) {
    var input = document.getElementById(name);
    var message = input.checked ? '' : 'Please confirm this to continue.';
    setError(name, message);
    if (message) valid = false;
  });
  if (!headshotData) {
    setError('headshot', 'Please add your professional headshot.');
    valid = false;
  }
  if (!valid) {
    var first = document.querySelector('[aria-invalid="true"]');
    if (first) first.focus();
  }
  return valid;
}

form.addEventListener('submit', function (event) {
  event.preventDefault();
  document.getElementById('formError').textContent = '';
  if (!validate()) return;

  var button = document.getElementById('submitBtn');
  button.disabled = true;
  button.querySelector('span').textContent = 'Sending your profile...';
  var payload = {
    name: form.name.value,
    preferredName: form.preferredName.value,
    email: form.email.value,
    phone: form.phone.value,
    venture: form.venture.value,
    ventureSummary: form.ventureSummary.value,
    discord: form.discord.value,
    availability: form.availability.checked,
    mediaConsent: form.mediaConsent.checked,
    headshot: headshotData
  };

  fetch('/api/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(function (response) {
    return response.json().then(function (data) { return { ok: response.ok, data: data }; });
  }).then(function (result) {
    if (!result.ok) throw new Error(result.data.error || 'We could not send your profile.');
    document.getElementById('successName').textContent = result.data.name;
    document.getElementById('formWrap').hidden = true;
    document.getElementById('success').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }).catch(function (error) {
    document.getElementById('formError').textContent = error.message + ' Please check your details and try again.';
    button.disabled = false;
    button.querySelector('span').textContent = 'Complete my onboarding';
  });
});
