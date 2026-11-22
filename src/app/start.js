// Starts the page: each part's start-up code runs in the order the parts are listed.
import { start as start_booth } from "./booth.js";
import { start as start_drawers } from "./drawers.js";
import { start as start_things } from "./things.js";
import { start as start_contact } from "./contact.js";
import { start as start_whiteboard } from "./whiteboard.js";
import { start as start_intercom } from "./intercom.js";
import { start as start_ambient } from "./ambient.js";
import { start as start_actions } from "./actions.js";
import { start as start_save } from "./save.js";

start_booth();
start_drawers();
start_things();
start_contact();
start_whiteboard();
start_intercom();
start_ambient();
start_actions();
start_save();
