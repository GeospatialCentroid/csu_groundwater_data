var csv = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQobUIOGszbmDPSGv9jpb5M1_zQgB9oUTXQDtgx2F6Oge3LxhKBRHGolid15RLVmw/pub?gid=1684074039&single=true&output=csv"
var tms_col="TMS"
var annotation_col="Annotation"
var name_col="Map Name"
var year_col="Year"
var base_url="https://archives.mountainscholar.org/digital/api/singleitem/collection/p17393coll166/id/"
var iiif_base_url="https://archives.mountainscholar.org/iiif/2/p17393coll166:"
//
field_data_url="https://docs.google.com/spreadsheets/d/e/2PACX-1vSDqaQMTu6Peq8FV8Z6lBW2hr9uz2kQ4s3RaW98W0p9Kq-UsE88yrEybWwUzJdfAsuW9RQptY-dibbf/pub?output=csv"
field_data_post_url="https://script.google.com/macros/s/AKfycbz_A2MSHJ5Zd2szCC5oWkkFcTKZ1_VjnuEl_ywpwnrkvKk-6ZZU0y9hZRAGGSoaM1dhrQ/exec"

//
var map_manager
var map_layer
var click_marker;
var side_by_side_control
var layer_rects=[]

var image_manager

var transcription
var transcription_mode;

var params={}
var last_params={}
var usp={};// the url params object to be populated
var browser_control=false; //flag for auto selecting to prevent repeat cals

var progress_interval;

var geo_locations="https://docs.google.com/spreadsheets/d/e/2PACX-1vRbGI3aCfUlvPm1ctzPWjdHqqFueh6lZB71bK5bxh_OhGNctO317h9aQJn9C98u6rjGNan5-T4kxZA2/pub?gid=1548886854&single=true&output=csv"


function setup_params(){
     usp = new URLSearchParams(window.location.search.substring(1).replaceAll("~", "'").replaceAll("+", " "))

    if (window.location.search.substring(1)!="" && $.isEmptyObject(params)){
       if (usp.get('e')!=null){
            params['e'] =  rison.decode(usp.get('e'))
        }
        //support passing contentdm id
        if (usp.get('id')!=null){
            params['id'] =  usp.get('id')
        }
        if (usp.get('t')!=null){
           console.log("transcription mode")
           transcription_mode=true;
        }

    }
}

window.onload = function() {
         //simulate progress - load up to 90%
      var current_progress = 0;
     progress_interval = setInterval(function() {
          current_progress += 5;
          $("#loader").css("width", current_progress + "%")
          if (current_progress >= 90)
              clearInterval(progress_interval);

      }, 100);
};
$(document).ready(function() {
    load_do(csv,init)

});


function load_do(_file,_do){
    $.ajax({
        type: "GET",
        url: _file,
        dataType: "text",
        success: function(csv_txt) {
         _do(csv_txt);
         }
     });
}

function init(_csv_txt){

    setup_params()

    map_manager = new Map_Manager(
     {params:params['e'] ,
        lat:40.111,
        lng: -104.1378635,
        z:7
        })

    map_manager.init()

    image_manager = new Image_Manager({params:{}})

     // allow for iiif viewing
     image_manager.init()
     if(params['id']){
       image_manager.show_image(iiif_base_url+params['id']+"/info.json","")
     }

   // Load the spreadsheet and
   var data = $.csv.toObjects(_csv_txt);
   for(var i=0;i<data.length;i++){

     load_annotation_geojson(data[i][annotation_col]+".geojson",{'annotation_url':data[i][annotation_col],'tms':data[i][tms_col],"title":data[i][name_col]+" "+data[i][year_col]})
   }
   // load the points
   load_do(geo_locations,save_marker_data)

    if(transcription_mode){
        transcription = new Transcription({
        field_data_post_url:field_data_post_url,
        })
        load_do(field_data_url,save_transcription_data)
    }

}
function save_marker_data(_data){
    map_manager.data = $.csv.toObjects(_data);
    check_all_loaded();
}
function save_transcription_data(_data){
    transcription.data = $.csv.toObjects(_data);
    check_all_loaded();
}

function check_all_loaded(){

    //if we are transcribing we need to make sure that both the geolocated sheets
    //and the transcriptions are loaded
  if(transcription_mode){
    if(transcription.data && map_manager.data){
        transcription.group_transcription()
        transcription.connect_transcription()
        all_done()
    }
  }else{
        all_done()
  }
}
function all_done(){
     clearInterval(progress_interval)
        $("#loader").css("width", 100 + "%")
        setTimeout( function() {

            $(".overlay").fadeOut("slow", function () {
                $(this).css({display:"none",'background-color':"none"});
            });
        },600);

     map_manager.create_geojson()
}

function save_params(){
    var p = "?"
    +"e="+rison.encode(map_manager.params)
    if(JSON.stringify(p) != JSON.stringify(last_params) && !browser_control){
       window.history.pushState(p, null, window.location.pathname+p.replaceAll(" ", "+").replaceAll("'", "~"))
        last_params = p
    }
}


load_annotation_geojson= function(url,extra){
    $.ajax({
        type: "GET",
        url: url,
        dataType: "json",
        extra:extra,
        success: function(json) {
         parse_annotation(json,extra);
         }
     });
}
parse_annotation= function(json,extra){
         var rect =   L.geoJson(json, {pane: 'left',color: 'blue'})
         rect.title=extra["title"]
         rect.tms=extra["tms"]
         rect['annotation_url']=extra['annotation_url']
         rect.toggle="show"
         rect.addTo(map_manager.map);
         layer_rects.push(rect)
         rect.id=layer_rects.length-1
         rect.on('click', function () {
            toggle_layer(this.id)
            this.off('click')
         });
}

update_layer_list=function(){
    var html=""
    var map_bounds=map_manager.map.getBounds()
    for(var i =0;i<layer_rects.length;i++){
        if(map_bounds.intersects(layer_rects[i].getBounds())){
            html+=layer_rects[i].title+" <a id='layer_but_"+i+"' href='#' onclick='toggle_layer("+i+");'>"+layer_rects[i].toggle+"</a><br/>"

        }

    }
    $("#layer_list").html(html)
}
toggle_layer = function(id){
    var layer = layer_rects[id]
    if(layer.toggle=="show"){
        layer.toggle="hide"
        layer.map_layer =new Allmaps.WarpedMapLayer(layer['annotation_url'],{pane: 'right'})
        map_manager.map.addLayer(layer.map_layer)
        // we need to make sure a layer exist first before side to side control can function
        if(!side_by_side_control){
            side_by_side_control = L.control.sideBySide(layer.map_layer, []).addTo(map_manager.map);
        }
     }else{
        map_manager.map.removeLayer(layer.map_layer)
        layer.on('click', function () {
            toggle_layer(this.id)
            this.off('click')
         });
        layer.toggle="show"
     }
     $("#layer_but_"+id).html(layer.toggle)

}


function connect_transcription(_data){
     var data = $.csv.toObjects(_data);
     for(var i=0;i<data.length;i++){
            console.log(data[i])
     }
}


function copyElementToClipboard(element) {
  window.getSelection().removeAllRanges();
  let range = document.createRange();
  range.selectNode(typeof element === 'string' ? document.getElementById(element) : element);
  window.getSelection().addRange(range);
  document.execCommand('copy');
  window.getSelection().removeAllRanges();
}
