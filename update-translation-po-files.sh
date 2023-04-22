#!/bin/bash

reffile=mediacontrols.pot

xgettext --from-code=UTF-8 --output=po/"$reffile" *.js prefs4.ui ./schemas/*.xml

cd po

for pofile in *.po
	do
		echo "Updating: $pofile"
		msgmerge -U "$pofile" "$reffile"
	done

rm *.po~
echo "Done."
