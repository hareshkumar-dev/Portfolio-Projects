import { LightningElement } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import MEET_SLOT from '@salesforce/resourceUrl/meetSlot';

import getMeetings from '@salesforce/apex/MeetSlotController.getMeetings';
import createMeeting from '@salesforce/apex/MeetSlotController.createMeeting';
import deleteMeeting from '@salesforce/apex/MeetSlotController.deleteMeeting';

/**
 * Host component for the bundled React team calendar.
 *
 * Kept deliberately thin: load the bundle from the static resource,
 * mount React into a container, and hand it an `api` bridge whose
 * functions call Apex — so the React code stays a plain SPA with no
 * Salesforce specifics.
 *
 * Rendered in the Light DOM so React's DOM and its injected styles
 * behave like a normal page.
 */
export default class MeetSlot extends LightningElement {
    static renderMode = 'light';

    _initialized = false;

    renderedCallback() {
        if (this._initialized) return;
        this._initialized = true;

        loadScript(this, MEET_SLOT)
            .then(() => this.mountReact())
            .catch((error) => {
                // eslint-disable-next-line no-console
                console.error('Failed to load the MeetSlot bundle', error);
                const el = this.querySelector('.react-root');
                if (el) {
                    el.textContent = 'Could not load the calendar bundle. Check the static resource deployed.';
                }
            });
    }

    mountReact() {
        const el = this.querySelector('.react-root');
        if (!el || !window.MeetSlotApp) return;

        // The bridge: React calls these; they resolve to Apex results.
        const api = {
            getMeetings: (year, month) => getMeetings({ year, month }),
            createMeeting: (data) => createMeeting({ payload: JSON.stringify(data) }),
            deleteMeeting: (id) => deleteMeeting({ meetingId: id })
        };

        window.MeetSlotApp.mount(el, api);
    }

    disconnectedCallback() {
        const el = this.querySelector('.react-root');
        if (this._initialized && window.MeetSlotApp && el) {
            window.MeetSlotApp.unmount(el);
        }
    }
}
