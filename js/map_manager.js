class Map_Manager {
  constructor(properties) {

    for (var p in properties){
        this[p]=properties[p]
    }
    if (this.params){
        if (this.params.hasOwnProperty('z')){
            this.z = Number(this.params['z'])
        }
         if (this.params.hasOwnProperty('c')){
            var c = this.params['c'].split(',')
            this.lat= Number(c[0])
            this.lng = Number(c[1])
        }

    }else{
        this.params={}
    }
     this.map = L.map('map',{doubleClickZoom: false,
     }).setView([this.lat, this.lng], this.z);
     this.markers=[]
  }
  init(){
    var $this=this
     L.control.scale().addTo( this.map);
     this.map.createPane('left');
    var right_pane=  this.map.createPane('right');

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    pane: 'left',
    attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo( this.map)

     //
    const search = new GeoSearch.GeoSearchControl({
      provider: new GeoSearch.OpenStreetMapProvider(),
    });

    this.map.addControl(search);

   // get lat lng on click
    this.map.on('dblclick', function(e) {
     $this.create_marker(e.latlng)
    });
    //

    L.control.layer_list({ position: 'bottomleft' }).addTo( this.map);

     L.control.location_search({ position: 'topleft' }).addTo( this.map);
     var search_html=""
     search_html+='<input type="text" id="search_text" name="search_text" placeholder="lat,lng or Well #" >'// value="2-59-8"
     search_html+='<select name="bearing" id="bearing"><option value="NW">NW</option><option value="SW">SW</option><option value="NE">NE</option><option value="SE">SE</option></select>'
     search_html+='<button type="submit" id="search_location">search</button>'
     $("#location_search").append(search_html)

     $("#search_location").on('click',function(){
      if($("#search_text").val().indexOf(",")>-1){
        var lat_lng=$("#search_text").val().split(",").map( Number )

        lat_lng=new L.latLng(lat_lng[0],lat_lng[1])
         $this.create_marker(lat_lng)
        }else{
            // we're working with and a well #
            // start by parsing the sections
            //Well #" 2-59-8 is actually Sec 8, T 2, R 59
            //B7-66-14dcc
            var well_nums=$("#search_text").val().split("-")
            for (var i=0;i<well_nums.length;i++){
                well_nums[i]= well_nums[i].replace(/[A-z]/g, '')
                if( i==2 && well_nums[i].length==1){
                    well_nums[i]="0"+well_nums[i]
                }
            }
            var bearing = $("#bearing").val().split("")
            var township_section_name=well_nums[0]+bearing[0]+"+"+well_nums[1]+bearing[1]+"+"+well_nums[2]//"12S+73W+08" - 012,120,102,021,210,201
            var url="https://services5.arcgis.com/rqsYvPKZmvSrSWbw/arcgis/rest/services/PLSS_2020_VIEW/FeatureServer/2/query?where=Search_Name%3D%27"+township_section_name+"%27&fullText=&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&resultType=none&distance=0.0&units=esriSRUnit_Meter&relationParam=&returnGeodetic=false&outFields=*&returnGeometry=true&returnCentroid=false&returnEnvelope=false&featureEncoding=esriDefault&multipatchOption=xyFootprint&maxAllowableOffset=&geometryPrecision=&outSR=&defaultSR=&datumTransformation=&applyVCSProjection=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnExtentOnly=false&returnQueryGeometry=false&returnDistinctValues=false&cacheHint=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&having=&resultOffset=&resultRecordCount=&returnZ=false&returnM=false&returnExceededLimitFeatures=true&quantizationParameters=&sqlFormat=none&f=pgeojson&token="
            $("#bearing").removeClass("option_valid")
            $("#bearing").addClass("option_error")
            load_do(url, $this.parse_township_section_geojson)
        }
     })


    this.map.on("moveend", function () {
      update_layer_list();
      var c =  map_manager.map.getCenter()
         map_manager.set_url_params("c",c.lat+","+c.lng)
         map_manager.set_url_params("z", map_manager.map.getZoom())
         save_params()
    });
  }
    move_map_pos(_params){
        var z = Number(_params['z'])
        var c = _params['c'].split(',')
        var lat= Number(c[0])
        var lng = Number(c[1])
         this.map.setView([lat, lng], z, {animation: true});
    }

    set_url_params(type,value){
        // allow or saving details outside of the filter list but
        //added to the json_str when the map changes
         this.params[type]= value

    }
    // markers
  create_geojson(){
   var data=this.data;
   var output_json={ "type": 'FeatureCollection', "features": []}
   for(var i=0;i<data.length;i++){
        if(data[i]["Well #"]!=""){

           var obj_props={
            "title":data[i]["Title"],
            "info_page":data[i]["Reference URL"],
            "id":data[i]["CONTENTdm number"],
            "thumb_url":base_url+data[i]["CONTENTdm number"]+"/thumbnail",
            "well":data[i]["Well #"],
            "iiif":iiif_base_url+data[i]["CONTENTdm number"]+"/info.json",
             "attribution":data[i]["Title"],
           /* "creato":data[i]["Creator"],
            "date":data[i]["Date"],*/
              }
             if(data[i].data){
                obj_props["has_data"]= true
             }

            output_json["features"].push({ "type": 'Feature', "properties": obj_props,
                           "geometry":{"type": 'Point',"coordinates": [Number(data[i]["Longitude"]),Number(data[i]["Latitude"])]}})
        }
   }
    map_manager.show_geojson(output_json)
}
 show_geojson(_data){
      var $this=this
      var geojson_markers;
      var clustered_points = L.markerClusterGroup();
      console.log("Geolocated data sheets:",_data.features.length)
        var geojson_markers = L.geoJson(_data, {
          onEachFeature: function (feature, layer) {
              var transcription_link=''
              if(transcription_mode){
                transcription_link='<br/> <a href="javascript:void(0);" onclick="transcription.show_form('+feature.properties.id+')" >transcription</a>'
              }
              layer.bindPopup('<h4>'+feature.properties.title+'</h4><a href="javascript:void(0);" onclick="image_manager.show_image(\''+feature.properties.iiif+'\',\''+feature.properties.attribution+'\',\''+feature.properties.info_page+'\')" ><img class="center" src="'+feature.properties.thumb_url+'" alt="'+feature.properties.title+'"></a> '
              +'<br/>Well #: '+feature.properties.well+transcription_link);
                //<br/>Creator: '+feature.properties.creato+'<br/>Date: '+feature.properties.date+''
          },
          pointToLayer: function (feature, latlng) {
                var extra=''
                if(feature.properties.has_data){
                    extra='style="border-color: black;"'
                }
                var marker= L.marker(latlng, {icon: $this.get_marker_icon(extra)});
                $this.markers.push(marker);//track the marker
                return marker
            }
        });
        clustered_points.addLayer(geojson_markers);
        this.map.addLayer(clustered_points);

    }
    highlight_marker(_id){
        for(var i=0;i<this.markers.length;i++){
            if(this.markers[i].feature.properties.id==_id){
                var extra='style="border-color: black;"'
                this.markers[i]._icon.innerHTML='<span class="marker" '+extra+'/>'
            }
        }
    }
    get_marker_icon(extra){
        // define a default marker
        return L.divIcon({
          className: "marker_div",
          iconAnchor: [0, 8],
          labelAnchor: [-6, 0],
          popupAnchor: [0, -36],
          html: '<span class="marker" '+extra+'/>'
        })
    }
    // township search

    parse_township_section_geojson(data){
        var feature = L.geoJson(JSON.parse(data))//.addTo(map_manager.map);
        map_manager.map.fitBounds(feature.getBounds());
        map_manager.create_marker(feature.getBounds().getCenter())
        //show success
        $("#bearing").removeClass("option_error")
        $("#bearing").addClass("option_valid")
    }
    create_marker(lat_lng){
        if(click_marker){
            this.map.removeLayer(click_marker);
        }
        click_marker = new L.marker(lat_lng).addTo(this.map);
        var lat = lat_lng["lat"].toFixed(7);
        var lng = lat_lng["lng"].toFixed(7);
        var html="<table id='lat_lng_table'><tr><td>"+lat+"</td><td>"+lng+"</td></tr></table>"
        html+="<a href='#' onclick='copyElementToClipboard(\"lat_lng_table\");'>copy</a>"

        var popup = L.popup().setContent(html);

        click_marker.bindPopup(popup).openPopup();

    }

 }