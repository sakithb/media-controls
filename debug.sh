#! /bin/bash

EXT_DIR="$HOME/.local/share/gnome-shell/extensions/mediacontrols@cliffniff.github.com/";

build() {
    VERSION=$(cat metadata.json | grep '"version"' | sed 's/[^0-9]*//g');

    gnome-extensions pack --podir=po/ --extra-source=dbus.js --extra-source=player.js --extra-source=utils.js --extra-source=widget.js --extra-source=LICENSE

    if [[ `git status --porcelain` ]]; then
        VERSION="~$VERSION~"  ;
    fi

    mkdir -p "./builds/v$VERSION";
    mv mediacontrols@cliffniff.github.com.shell-extension.zip "./builds/v$VERSION/extension.zip";
}

copy() {
    mkdir -p "$EXT_DIR";
    cp -r ./* "$EXT_DIR";
}

debug() {
    copy;

    export MUTTER_DEBUG_DUMMY_MODE_SPECS=$(cat /sys/class/drm/*/modes | head -n 1)
    dbus-run-session -- gnome-shell --nested --wayland
}

update_po_files() {
    xgettext --from-code=UTF-8 --output=po/mediacontrols.pot *.js ./schemas/*.xml

    cd po

    for POFILE in *.po
	do
		echo "Updating: $POFILE"
		msgmerge -U "$POFILE" "mediacontrols.pot"
	done

    rm *.po~
    echo "Done."
}

PARAMS=();

for i in $@
do
    PARAMS+=( $i )
done

if [[ " ${PARAMS[*]} " =~ " -h" ]]; then
    echo "Usage: ./debug.sh [options]";
    echo "Options:";
    echo "  -h  Show this help message";
    echo "  -b  Build extension";
    echo "  -u  Update extension source files";
    echo "  -d  Debug extension";
    echo "  -t  Update translation po files";
    exit;
fi

if [[ " ${PARAMS[*]} " =~ " -b " ]]; then
    build;
fi

if [[ " ${PARAMS[*]} " =~ " -d " ]]; then
    debug;
fi

if [[ " ${PARAMS[*]} " =~ " -u " ]]; then
    copy;
fi

if [[ " ${PARAMS[*]} " =~ " -t " ]]; then
    update_po_files;
fi