import { LightningElement } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import PROJECT_BOARD from '@salesforce/resourceUrl/projectBoard';

import getTasks from '@salesforce/apex/ProjectBoardController.getTasks';
import createTask from '@salesforce/apex/ProjectBoardController.createTask';
import updateStage from '@salesforce/apex/ProjectBoardController.updateStage';
import deleteTask from '@salesforce/apex/ProjectBoardController.deleteTask';

/**
 * Host component for the bundled React Kanban app.
 *
 * Responsibilities (kept deliberately thin):
 *  1. Load the React bundle (a static resource) with loadScript.
 *  2. Mount React into a container element.
 *  3. Hand React an `api` bridge whose functions call Apex — so the
 *     React code stays a plain SPA with no Salesforce specifics.
 *
 * Renders in the Light DOM so the mounted React tree and its injected
 * styles behave like a normal page (no shadow-DOM style boundary).
 */
export default class ProjectBoard extends LightningElement {
    static renderMode = 'light';

    _initialized = false;

    renderedCallback() {
        if (this._initialized) return;
        this._initialized = true;

        loadScript(this, PROJECT_BOARD)
            .then(() => this.mountReact())
            .catch((error) => {
                // eslint-disable-next-line no-console
                console.error('Failed to load the Project Board bundle', error);
                const el = this.querySelector('.react-root');
                if (el) {
                    el.textContent = 'Could not load the board bundle. Check the static resource deployed.';
                }
            });
    }

    mountReact() {
        const el = this.querySelector('.react-root');
        if (!el || !window.ProjectBoardApp) return;

        // The bridge: React calls these; they resolve to Apex results.
        const api = {
            getTasks: () => getTasks(),
            createTask: (data) => createTask({ payload: JSON.stringify(data) }),
            updateStage: (id, stage) => updateStage({ taskId: id, stage }),
            deleteTask: (id) => deleteTask({ taskId: id })
        };

        window.ProjectBoardApp.mount(el, api);
    }

    disconnectedCallback() {
        const el = this.querySelector('.react-root');
        if (this._initialized && window.ProjectBoardApp && el) {
            window.ProjectBoardApp.unmount(el);
        }
    }
}
