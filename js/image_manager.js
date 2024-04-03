class Image_Manager {
      constructor(properties) {

         // track image_layer
         this.image_layer;
      }
    // allow iiif images to show in same window
    init(){
            this.image_map = L.map('image_map', {
             center: [0, 0],
              zoom:  1,
              crs: L.CRS.Simple,
              rotate:true,

        })
        this.image_map._resetView(this.image_map.getCenter(), this.image_map.getZoom());
        this.degrees=0
        }
     show_image(img,attribution,info_page){
        $("#image_map").width("75%")
        $("#image_map").show()
         $("#map").width("25%")
         $("#map").css({'left':"75%"})
         //$("#leaflet_spinner").show();

         if(this.image_layer){
            image_manager.image_map.removeLayer(this.image_layer);
        }

        this._img =L["tileLayer"]["iiif"](img)
        this._img.addTo(this.image_map);
        this.image_layer = this._img; // store for future reference

        this._img.on('load', function (e) {
            console.log("image Load complete")
            $("#leaflet_spinner").hide();
        });
        map_manager.map.invalidateSize(true)
        this.image_map.invalidateSize(true)

        this.image_map.attributionControl._attributions = {};
        this.image_map.attributionControl.addAttribution("<a href=\""+info_page+"\" target=\"_new\">"+attribution+"</a>");

     }
     rotate_image(){
        this.degrees+=90
        this.image_map.setBearing(this.degrees);
     }
    hide_image(){

        $("#image_map").hide()
         $("#map").width("100%")
         $("#map").css({'left':"0px"})
          map_manager.map.invalidateSize(true)
    }
 }