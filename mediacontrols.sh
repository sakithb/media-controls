#!/usr/bin/env bash
set -e

nested() {
  export MUTTER_DEBUG_DUMMY_MODE_SPECS=1366x768
  dbus-run-session -- gnome-shell --unsafe-mode --nested --wayland --no-x11
}

build() {
  echo "Compiling..."
  npm run compile

  if [ "$1" = "release" ]; then
    echo "Prettifying..."
    npm run compile:padding 1>/dev/null

    echo "Stripping debug values..."
    sed 's/const DEBUG = true;/const DEBUG = false;/g' ./dist/compiled/utils/common.js >./dist/compiled/utils/common.js.tmp
    mv ./dist/compiled/utils/common.js.tmp ./dist/compiled/utils/common.js
  fi

  cp src/metadata.json dist/compiled/metadata.json
  cp src/stylesheet.css dist/compiled/stylesheet.css

  echo "Packing..."

  EXCLUDEFILES=("metadata.json" "extension.js" "prefs.js" "stylesheet.css")
  EXCLUDEDIRS=("compiled")
  JSSRCDIR="$PWD/dist/compiled"
  BUILDDIR="$PWD/dist/builds"

  FINDFARGS=()

  for F in "${EXCLUDEFILES[@]}"; do
    FINDFARGS+=("!" "-name" "$F")
  done

  FINDDARGS=()

  for D in "${EXCLUDEDIRS[@]}"; do
    FINDDARGS+=("!" "-name" "$D")
  done

  EXTRAFILES=$(find "$JSSRCDIR" -maxdepth 1 -type f "${FINDFARGS[@]}")
  EXTRADIRS=$(find "$JSSRCDIR" -type d "${FINDDARGS[@]}")
  ESFLAGS=()

  for F in $EXTRAFILES; do
    ESFLAGS+=("--extra-source=$F")
  done

  for D in $EXTRADIRS; do
    ESFLAGS+=("--extra-source=$D")
  done

  SCHEMA="$PWD/assets/org.gnome.shell.extensions.mediacontrols.gschema.xml"
  PODIR="$PWD/assets/locale"

  mkdir -p "$BUILDDIR"
  gnome-extensions pack -f -o "$BUILDDIR" --schema="$SCHEMA" --podir="$PODIR" "${ESFLAGS[@]}" "$JSSRCDIR"
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
  xgettext --from-code=UTF-8 \
    --add-comments \
    --join-existing \
    --keyword=_ \
    --keyword=C_:1c,2 \
    --language=Javascript \
    --output=assets/locale/mediacontrols@cliffniff.github.com.pot \
    src/*.ts src/**/*.ts \
    assets/ui/*.blp

  for pofile in assets/locale/*.po
	  do
  		echo "Updating: assets/locale/mediacontrols@cliffniff.github.com.pot"
		  msgmerge -U "$pofile" "assets/locale/mediacontrols@cliffniff.github.com.pot"
	  done
    rm assets/locale/*.po~
  echo "Done"
}

lint() {
  echo "Linting..."
  npm run lint
}

format() {
  echo "Formatting..."
  npm run format
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
lint)
  lint
  ;;
format)
  format
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
  echo "Usage: $0 {prod|build|reload|debug|translations|lint|format|install|uninstall|enable|disable|prefs|watch}"
  exit 1
  ;;
esac
