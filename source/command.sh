#!/usr/bin/bash
keepAlive=1
while [ $keepAlive == 1 ];
do
	clear
	printf "[pbnBOT]:$ "
	read commandString
	[[ "$commandString" == "quit" ]] && keepAlive=0
	echo $commandString > ../data/input/pbnc.run
done

