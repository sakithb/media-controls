#! /bin/bash
# Use the -p flag to generate the zip file, the -r flag to restart the gnome shell and -i flag to install extension

EXT_DIR="$HOME/.local/share/gnome-shell/extensions/mediacontrols@cliffniff.github.com/";

install() {
    curl -OL https://github.com/cliffniff/media-controls/releases/latest/download/extension.zip;

    gnome-extensions install -f extension.zip
    rm -rf extension.zip
}

build() {
    #git archive -o Release.zip HEAD;
    gnome-extensions pack --podir=po/ --extra-source=dbus.js --extra-source=player.js --extra-source=utils.js --extra-source=widget.js --extra-source=LICENSE
    mv mediacontrols@cliffniff.github.com.shell-extension.zip Release.zip
    #zip -d Release.zip README.md;
    #zip -d Release.zip images/*;
    #zip -d Release.zip images/;
    #zip -d Release.zip .gitignore;
    #zip -d Release.zip build.sh;
    #zip -d Release.zip install.sh;
    #zip -d Release.zip .github/*;
    #zip -d Release.zip .github/;
    VERSION=$(cat metadata.json | grep '\"version\"' | sed 's/[^0-9]*//g');

    if [[ `git status --porcelain` ]]; then
        VERSION="~$VERSION~"  ;
    fi

    mkdir -p "./builds/v$VERSION";
    mv Release.zip "./builds/v$VERSION/extension.zip";
}

restart() {
    busctl --user call org.gnome.Shell /org/gnome/Shell org.gnome.Shell Eval s 'Meta.restart("Restarting…")';
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