import Gtk from 'gi://Gtk?version=4.0';
import Adw from 'gi://Adw?version=1';
import Gio from 'gi://Gio?version=2.0';
import {ExtensionPreferences} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"

export default class MediaControlsPreferences extends ExtensionPreferences {
    private window: Adw.PreferencesWindow;
    private settings: Gio.Settings;

    private generalPage: Adw.PreferencesPage;
    private appearancePage: Adw.PreferencesPage;
    private positionsPage: Adw.PreferencesPage;
    private shortcutsPage: Adw.PreferencesPage;
    private otherPage: Adw.PreferencesPage;


    fillPreferencesWindow(window: Adw.PreferencesWindow) {
        this.window = window;
        this.settings = this.getSettings();

        const builder = Gtk.Builder.new_from_file("prefs.ui");

        this.generalPage = builder.get_object("page-general") as Adw.PreferencesPage;
        this.appearancePage = builder.get_object("page-appearance") as Adw.PreferencesPage;
        this.positionsPage = builder.get_object("page-positions") as Adw.PreferencesPage;
        this.shortcutsPage = builder.get_object("page-shortcuts") as Adw.PreferencesPage;
        this.otherPage = builder.get_object("page-other") as Adw.PreferencesPage;
        
        this.window.add(this.generalPage);
        this.window.add(this.appearancePage);
        this.window.add(this.positionsPage);
        this.window.add(this.shortcutsPage);
        this.window.add(this.otherPage);
    }
}
