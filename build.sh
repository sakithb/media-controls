#! /bin/bash
# Use the -p flag to generate the zip file, the -r flag to restart the gnome shell and -i flag to install extension

EXT_DIR="$HOME/.local/share/gnome-shell/extensions/mediacontrols@cliffniff.github.com/";

install() {
    curl -OL https://github.com/cliffniff/media-controls/releases/latest/download/extension.zip;

    gnome-extensions install -f extension.zip
    rm -rf extension.zip
}

# install_build() {
#     VERSION=$(cat metadata.json | grep '"version"' | sed 's/[^0-9]*//g');
    
#     gnome-extensions uninstall -q mediacontrols@cliffniff.github.com;

#     gnome-extensions pack --podir=po/ --extra-source=dbus.js --extra-source=player.js --extra-source=utils.js --extra-source=widget.js --extra-source=LICENSE
    
#     mkdir -p "./builds/v~$VERSION~";
#     mv mediacontrols@cliffniff.github.com.shell-extension.zip "./builds/v~$VERSION~/extension.zip";

#     gnome-extensions install "./builds/v~$VERSION~/extension.zip";
# }

build() {
    VERSION=$(cat metadata.json | grep '"version"' | sed 's/[^0-9]*//g');

    gnome-extensions pack --podir=po/ --extra-source=dbus.js --extra-source=player.js --extra-source=utils.js --extra-source=widget.js --extra-source=LICENSE

    if [[ `git status --porcelain` ]]; then
        VERSION="~$VERSION~"  ;
    fi

    mkdir -p "./builds/v$VERSION";
    mv mediacontrols@cliffniff.github.com.shell-extension.zip "./builds/v$VERSION/extension.zip";
}

restart() {
    # pkill -HUP gnome-shell;
    # busctl --user call org.gnome.Shell /org/gnome/Shell org.gnome.Shell Eval s 'Meta.restart("Restarting...", global.context)';
    
    # gnome-extensions disable mediacontrols@cliffniff.github.com;
    # gnome-extensions enable mediacontrols@cliffniff.github.com;

    echo "https://gitlab.gnome.org/GNOME/gnome-shell/-/issues/7050";
}

copy() {
    mkdir -p "$EXT_DIR";
    cp -r ./* "$EXT_DIR";
}

PARAMS=();

for i in $@
do
    PARAMS+=( $i )
done

if [[ " ${PARAMS[*]} " =~ " -p " ]]; then
    build;
fi

if [[ " ${PARAMS[*]} " =~ " -i " ]]; then
    install;
fi

if [[ " ${PARAMS[*]} " =~ " -r " ]]; then
    copy;
    restart;
fi