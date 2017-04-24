Router.route('/', function(){
  if(isHTTPS()){
    this.route('consultancy_meeting');
  } else {
    switchHTTPS();
  }
})