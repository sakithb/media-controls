#! /bin/bash
# Use the -p flag to generate the zip file and the -r flag to restart the gnome shell

echo "Copying files to the extensions directory"
cp -r ./* ~/.local/share/gnome-shell/extensions/mediacontrols@cliffniff.github.com;

if [ "$1" == "-p" ] || [ "$2" == "-p" ]; then
    echo "Generating archive file";
    git archive -o Release.zip HEAD;
    zip -d Release.zip README.md;
    zip -d Release.zip /images;
    zip -d Release.zip .gitignore;
    zip -d Release.zip build.sh;
    VERSION=$(cat metadata.json | grep '\"version\"' | sed 's/[^0-9]*//g');
    mkdir -p "./builds";
    mv Release.zip "./builds/Release_v$VERSION.zip";
fi

if [ "$1" == "-r" ] || [ "$2" == "-r"  ]; then
    busctl --user call org.gnome.Shell /org/gnome/Shell org.gnome.Shell Eval s 'Meta.restart("Restarting…")';
fi
