  ______     _        ______      _    _         _ 
 |  ____|   | |      |___  /     | |  | |       | |
 | |__    __| |  ___    / /  ___ | |_ | |_  ___ | |
 |  __|  / _` | / _ \  / /  / _ \| __|| __|/ _ \| |
 | |____| (_| ||  __/ / /__|  __/| |_ | |_|  __/| |
 |______|\__,_| \___|/_____|\___| \__| \__|\___||_|
                                                    

Read ME

Autor: Elias Peeters
ProjectName: EdeZettel
Programmiersprache: NodeJs
package-manager: npm
framework: express

genutze Node Version: 10.15.2
genutzte npm Version: 5.8.0

mysql Version: 5.7.27

Website Zugriff: http://206.81.23.52:8000

Zugriff Datenbank:
	host: "206.81.23.52"
    user: "shoppinglistuser"
    password: "FAPeFWTomLjUXAVeg7CrqjaVHEhmzZmvJnHUkZJEBerAKAKkRLp"
    database: "shoppinglist"

Test Accounts
	Test1
		username: "Test"
		password: "1234"
	Test2
		username: "Test2"
		password: "1234"


Das Projekt beinhaltet eine Datenbank auf der alle Produkte und weiteren 
Daten gespeichert werden. Die Datenbank wird auf einem VPS von digitalOcean 
gehosted. Hier läuft zudem das komplette Projekt, welches hochgeladen wurde. 
Die Website kann über die obigen Daten aufgerufen. Zugriff auf die Datenbank 
herhalten Sie über die obigen Zugangsdaten für 'shoppinglistuser'. 

Das Projekt ist Accounts Based. Das heißt als User kann man sich einen Account 
erstellen und sich anschließend mit diesem Anmelden. Ich habe als Test zwei 
Test Accounts erstellt. Daten stehen ebenfalls oben. Jeder Nutzer hat seine 
eigenen Einkaufslisten, die er selbst verwalten kann. Er kann diese zudem über 
den teilen Button mit anderen Nutzer teilen. Dafür einfach den korrekten Namen 
des anderen Nutzers eintragen. Auf der Liste werden alle Nutzer angezeigt, die 
Zugriff haben. 
Der Öffentliche Link ist ein Link, welcher aktiviert und deaktiviert werden kann. 
Er gibt anderen Person zugriff auf die Liste, welche keinen Account haben. 
Sie können die Liste jedoch nur betrachten und nicht bearbeiten.

Das Programm wird gestartet über eine laufende Node version. Dafür einfach in 
das Verzeichnis gehen und hier den Befehl 

--> node main.js

ausführen. Die Unittest können über

--> npm test

gestartet werden.
