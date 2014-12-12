
/** Define globals*/
const coap        = require('coap')
		, server      = coap.createServer({ type: 'udp6' });

const http = require('http');
const path='sensors';

/*Array to mach key in sensor with value*/
var trans_name={
	t: 'temperature',
	h: 'humididy',
	vb:'battery voltage',
	al:'ambient light',
	dt:'dht temp',
	dh:'dht humidity',
	p:'presence'
};

/** Define functions*/
function Getid(url){
	var url_arr=url.split('/');
	return parseInt(url_arr[url_arr.length-1]);
}

function Ack(){
	var date = new Date();
	var min  = date.getMinutes();
	return ( {
						next_push:min%5,
						act:[]
					} );
}

function data2NGSIentity(id,data){
	var atributes=[];
	for (key in data){
		atributes.push(
			{
				name:trans_name[key],
				type:'float',
				value: parseFloat(data[key])
			}
		);
	}
	var entity={
		contextElements: [
				{
						type: "Sensor",
						isPattern: false,
						id: id,
						attributes: atributes
				}
		],
		updateAction: "APPEND"
	}
	return entity;
}
function callback (http_response,coap_req,coap_res){
	console.log(http_response);
	coap_res.StatusCode=parseInt(http_response.statusCode);
	var payload_response=JSON.stringify(Ack());
	coap_res.end(payload_response);
}

server.on('all', function(coap_req, coap_res) {
	console.log("BEGIN");
	var data=null;
	/*Set Data for POST*/
	if (coap_req.payload.length>0)
		data=(JSON.parse(coap_req.payload.toString()).data);

	var http_data=JSON.stringify(
									data2NGSIentity(
										Getid(coap_req.url),
										data
									)
								);
	console.log(http_data);
	var http_options = {
		host: 'fiware.crqgestion.es',
		path: '/v1/updateContext',
		port: 1026,
		method: 'POST',
		agent: false,
		headers:{
			'Accept':'application/json',
			'Content-Type':'application/json',
			'Content-Length': http_data.length /*Really needed for contex-brocker Orion*/
		}
	};
	var http_req = http.request(http_options, 
		function (http_response){
			var str='';
			 http_response.on('data', function (chunk) {
				str += chunk;
			 });
			 http_response.on('end', function (chunk) {
				callback(str,coap_req,coap_res);
			 });
  });
	http_req.on('error', function(e) {
 		console.log('problem with Http request: ' + e.message);
	});
	http_req.write(http_data);
	http_req.end();
}

// the default CoAP port is 5683
server.listen();