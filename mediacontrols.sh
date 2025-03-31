#!/usr/bin/env bash
set -e

nested() {
  export MUTTER_DEBUG_DUMMY_MODE_SPECS=1366x768
  dbus-run-session -- gnome-shell --unsafe-mode --nested --wayland --no-x11
}

build() {
  echo "Copying..."

  mkdir -p dist/temp
  mkdir -p dist/builds
  rm -rf dist/temp/*
  cp -r $(find src -mindepth 1 -maxdepth 1 -not -name "assets") dist/temp/.

  glib-compile-resources assets/org.gnome.shell.extensions.mediacontrols.gresource.xml --target=dist/temp/org.gnome.shell.extensions.mediacontrols.gresource --sourcedir=assets

  if [ "$1" = "release" ]; then
    echo "Stripping debug values..."
    sed 's/const DEBUG = true;/const DEBUG = false;/g' ./dist/temp/utils/common.js >./dist/temp/utils/common.js.tmp
    mv ./dist/temp/utils/common.js.tmp ./dist/temp/utils/common.js
  fi

  echo "Packing..."

  EXTRASRCS=$(find dist/temp/ -mindepth 1 -maxdepth 1 ! -name "metadata.json" ! -name "extension.js" ! -name "prefs.js" ! -name "stylesheet.css")
  ESFLAGS=()

  for F in $EXTRASRCS; do
    ESFLAGS+=("--extra-source=$PWD/$F")
  done

  SCHEMA="$PWD/assets/org.gnome.shell.extensions.mediacontrols.gschema.xml"
  PODIR="$PWD/assets/locale"

  gnome-extensions pack -f -o dist/builds/ --schema="$SCHEMA" --podir="$PODIR" "${ESFLAGS[@]}" dist/temp/
}

debug() {
  echo "Debugging..."
  build
  install
  nested
}

reload() {
  echo "Reloading..."
  build
  install

  if [ "$XDG_SESSION_TYPE" = "x11" ]; then
    pkill -HUP gnome-shell
  else
    echo "Reloading Wayland session is not supported yet."
  fi
}

translations() {
  echo "Updating translations..."

  touch assets/locale/mediacontrols@cliffniff.github.com.pot

  find . -type f -iname "*.ui" -o -iname "*.js" -not -path "./node_modules/*" | xargs xgettext --from-code=UTF-8 \
    --add-comments \
    --join-existing \
    --keyword=_ \
    --keyword=C_:1c,2 \
    --language=Javascript \
    --output=assets/locale/mediacontrols@cliffniff.github.com.pot

  for pofile in assets/locale/*.po; do
    echo "Updating: $pofile"
    msgmerge -U "$pofile" "assets/locale/mediacontrols@cliffniff.github.com.pot"
  done

  rm assets/locale/*.po~ 2>/dev/null
  echo "Done"
}

install() {
  echo "Installing..."
  gnome-extensions install --force ./dist/builds/mediacontrols@cliffniff.github.com.shell-extension.zip
}

uninstall() {
  echo "Uninstalling..."
  gnome-extensions uninstall mediacontrols@cliffniff.github.com
}

enable() {
  echo "Enabling..."
  gnome-extensions enable mediacontrols@cliffniff.github.com
}

disable() {
  echo "Disabling..."
  gnome-extensions disable mediacontrols@cliffniff.github.com
}

prefs() {
  echo "Opening prefs..."
  gnome-extensions prefs mediacontrols@cliffniff.github.com
}

watch() {
  echo "Watching for setting changes..."
  dconf watch /org/gnome/shell/extensions/mediacontrols/
}

case "$1" in
release)
  build "release"
  ;;
build)
  build
  ;;
debug)
  debug
  ;;
reload)
  reload
  ;;
translations)
  translations
  ;;
install)
  install
  ;;
uninstall)
  uninstall
  ;;
enable)
  enable
  ;;
disable)
  disable
  ;;
prefs)
  prefs
  ;;
watch)
  watch
  ;;
*)
  echo "Usage: $0 {release|build|reload|debug|translations|install|uninstall|enable|disable|prefs|watch}"
  exit 1
  ;;
esac
