#! /bin/bash

EXT_DIR="$HOME/.local/share/gnome-shell/extensions/mediacontrols@cliffniff.github.com/"

build() {
    VERSION=$(cat metadata.json | grep '"version"' | sed 's/[^0-9]*//g')

    gnome-extensions pack --podir=po/ --extra-source=dbus.js --extra-source=player.js --extra-source=utils.js --extra-source=widget.js --extra-source=LICENSE

    if [[ $(git status --porcelain) ]]; then
        VERSION="~$VERSION~"
    fi

    mkdir -p "./builds/v$VERSION"
    mv mediacontrols@cliffniff.github.com.shell-extension.zip "./builds/v$VERSION/extension.zip"
}

copy() {
    mkdir -p "$EXT_DIR"
    cp -r ./* "$EXT_DIR"
}

debug() {
    copy

    export MUTTER_DEBUG_DUMMY_MODE_SPECS=1366x768
    dbus-run-session -- gnome-shell --unsafe-mode --nested --wayland --no-x11
}

update_po_files() {
    xgettext --from-code=UTF-8 --output=po/mediacontrols.pot *.js ./schemas/*.xml

    cd po

    for POFILE in *.po; do
        echo "Updating: $POFILE"
        msgmerge -U "$POFILE" "mediacontrols.pot"
    done

    rm *.po~
    echo "Done."
}

lint() {
    npx eslint -c .eslintrc.yml *.js
}

lint_fix() {
    npx eslint -c .eslintrc.yml *.js --fix
}

PARAMS=()

for i in "$@"; do
    PARAMS+=($i)
done

if [[ " ${PARAMS[*]} " =~ " -h" ]]; then
    echo "Usage: ./debug.sh [options]"
    echo "Options:"
    echo "  -h  Show this help message"
    echo "  -b  Build extension"
    echo "  -u  Update extension source files"
    echo "  -d  Debug extension"
    echo "  -t  Update translation po files"
    echo "  -l  Lint codebase (check)"
    echo "  -f  Lint codebase (fix)"
    exit
fi

if [[ " ${PARAMS[*]} " =~ " -b " ]]; then
    build
fi

if [[ " ${PARAMS[*]} " =~ " -d " ]]; then
    debug
fi

if [[ " ${PARAMS[*]} " =~ " -u " ]]; then
    copy
    gnome-extensions disable mediacontrols@cliffniff.github.com
    gnome-extensions enable mediacontrols@cliffniff.github.com
fi

if [[ " ${PARAMS[*]} " =~ " -t " ]]; then
    update_po_files
fi

if [[ " ${PARAMS[*]} " =~ " -l " ]]; then
    lint
fi

if [[ " ${PARAMS[*]} " =~ " -f " ]]; then
    lint_fix
fi
