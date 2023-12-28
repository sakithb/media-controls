import GObject from "gi://GObject?version=2.0";
import St from "gi://St?version=13";
import MediaControls from "../extension.js";
import Shell from "gi://Shell?version=13";
import Clutter from "gi://Clutter?version=13";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import { LabelTypes, PanelElements, PlaybackStatus } from "../types/enums.js";
import PlayerProxy from "./PlayerProxy.js";

class PanelButton extends PanelMenu.Button {
    private playerProxy: PlayerProxy;
    private extension: MediaControls;

    private icon: St.Icon;
    private label: St.Label;
    private controls: St.BoxLayout;

    constructor(playerProxy: PlayerProxy, extension: MediaControls) {
        super(0.5, "Media Controls", false);

        this.playerProxy = playerProxy;
        this.extension = extension;
        this.addWidgets();
        this.addListeners();
    }

    public updateProxy(playerProxy: PlayerProxy) {
        this.playerProxy = playerProxy;
        this.addWidgets();
    }

    public isSamePlayer(playerProxy: PlayerProxy) {
        return this.playerProxy.busName === playerProxy.busName;
    }

    private addListeners() {
        // this.playerProxy.onChanged("PlaybackStatus", (value) => {
        //     if (this.extension.showControlIconsPlay) {
        //         this.addWidgets();
        //     }
        // });
    }

    private addWidgets() {
        this.remove_all_children();

        for (const element of this.extension.elementsOrder) {
            if (element === PanelElements.ICON && this.extension.showPlayerIcon) {
                this.addIcon();
            } else if (element === PanelElements.LABEL && this.extension.showLabel) {
                this.addLabel();
            } else if (element === PanelElements.CONTROLS && this.extension.showControlIcons) {
                this.addControls();
            }
        }
    }

    private addIcon() {
        const appSystem = Shell.AppSystem.get_default();
        const runningApps = appSystem.get_running();
        const app = runningApps.find((app) => app.get_name() === this.playerProxy.identity);

        if (app == null) {
            return;
        }

        this.icon = new St.Icon({
            gicon: app.get_icon(),
            effect: new Clutter.DesaturateEffect({ enabled: !this.extension.coloredPlayIcon }),
        });

        this.add_child(this.icon);
    }

    private addLabel() {
        this.label = new St.Label({
            text: this.getLabelText(),
        });

        this.add_child(this.label);
    }

    private addControls() {
        this.controls = new St.BoxLayout();

        if (this.extension.showControlIconsSeekBackward) {
            this.addControlIcon("media-seek-backward-symbolic");
        } else if (this.extension.showControlIconsPrevious) {
            this.addControlIcon("media-skip-backward-symbolic");
        } else if (this.extension.showControlIconsPlay) {
            if (this.playerProxy.playbackStatus === PlaybackStatus.PLAYING) {
                this.addControlIcon("media-playback-pause-symbolic");
            } else if (this.playerProxy.playbackStatus === PlaybackStatus.PAUSED) {
                this.addControlIcon("media-playback-start-symbolic");
            } else if (this.playerProxy.playbackStatus === PlaybackStatus.STOPPED) {
                this.addControlIcon("media-playback-start-symbolic");
            }
        } else if (this.extension.showControlIconsNext) {
            this.addControlIcon("media-skip-forward-symbolic");
        } else if (this.extension.showControlIconsSeekForward) {
            this.addControlIcon("media-seek-forward-symbolic");
        }
    }

    private addControlIcon(iconName: string) {
        const icon = new St.Icon({
            icon_name: iconName,
        });

        this.controls.add_child(icon);
    }

    private getLabelText() {
        const labelTextElements = [];

        for (const labelElement of this.extension.labelsOrder) {
            if (labelElement === LabelTypes.TITLE) {
                labelTextElements.push(this.playerProxy.metadata["xesam:title"]);
            } else if (labelElement === LabelTypes.ARTIST) {
                labelTextElements.push(this.playerProxy.metadata["xesam:artist"].join(", "));
            } else if (labelElement === LabelTypes.ALBUM) {
                labelTextElements.push(this.playerProxy.metadata["xesam:album"]);
            } else if (labelElement === LabelTypes.DISC_NUMBER) {
                labelTextElements.push(this.playerProxy.metadata["xesam:discNumber"]);
            } else if (labelElement === LabelTypes.TRACK_NUMBER) {
                labelTextElements.push(this.playerProxy.metadata["xesam:trackNumber"]);
            } else {
                labelTextElements.push(labelElement);
            }
        }

        return labelTextElements.join(" ");
    }
}

const classPropertiers = {
    GTypeName: "McPanelButton",
    Properties: {},
};

export default GObject.registerClass(classPropertiers, PanelButton);
