## What does this extension do?

Show controls and information of the currently playing media in the panel.

## Features

- Customize how the extension looks
- Disable elements you don't want
- Invoke different actions in many ways through mouse actions
- Basic media controls (play/pause/next/prev)
- Other media controls (loop/shuffle)
- And more...

---

## Notes

-   Only support Gnome 3.38 and 40

---

## Known issues

-   If you have installed the extension from extensions.gnome.org, there will be some padding and icon size issues with some themes as [reported here](https://github.com/cliffniff/media-controls/issues/16). To fix it run this command.

`cd ~/.local/share/gnome-shell/extensions/mediacontrols@cliffniff.github.com/ && curl -OL https://raw.githubusercontent.com/cliffniff/media-controls/main/player.js`

---

## Screenshots

![Screenshot](/images/Screenshot_info_menu.png)

![Screenshot](/images/Screenshot_sources_menu.png)

## How to install

#### Install from extensions.gnome.org

[<img src="./images/get-ego.png" height="100">](https://extensions.gnome.org/extension/4470/media-controls/)

OR

#### Fedora

`dnf install gnome-shell-extension-mediacontrols`

#### Other distributions

Install from source
-   Download and extract the zip file in the releases tab
-   Rename the extracted folder to `mediacontrols@cliffniff.github.com`
-   Move it to `~/.local/share/gnome-shell/extensions/`
-   Enable the extension in the Extensions app or type `gnome-extensions enable mediacontrols@cliffniff.github.com` in the terminal
