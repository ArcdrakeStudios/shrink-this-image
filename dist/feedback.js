import {mountMeasurementFeedback} from './shared/measurement-feedback-client.mjs';

// The app's i18n layer translates the shared EN copy in place, preserving drafts,
// pending submissions and receipt IDs when language changes. No form is remounted.
const ui = mountMeasurementFeedback(document.getElementById('measurement-feedback'), {
  product: 'shrink', language: 'en',
});
export const measurement = ui.client;
void measurement.track('page_view');
window.addEventListener('storage', ui.refreshChoice);
window.addEventListener('focus', ui.refreshChoice);
