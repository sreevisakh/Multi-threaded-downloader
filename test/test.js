var nd = require('../lib/ndRequest');

var options = {
	path: './Temp/Download.png',
	url: 'http://upload.wikimedia.org/wikipedia/commons/6/63/Wikipedia-logo.png',
	threads: 4

};


var _options = {
	path: './Temp/VirtualBox-4.2.12-84980-OSX.dmg',
	url: 'http://dlc.sun.com.edgesuite.net/virtualbox/4.2.12/VirtualBox-4.2.12-84980-OSX.dmg',
	threads: 4

};

nd.download(options);