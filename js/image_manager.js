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
        var control = new L.Control.Rotate_Button()
        control.addTo(this.image_map);
            $(".rotate_control").html('<a href="javascript:void(0);" role="button" onclick="image_manager.rotate_image()"> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-counterclockwise" viewBox="0 0 16 16" style="margin-top: 7px;"><path fill-rule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2z"></path><path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466"></path></svg></a>')

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
        this.degrees-=90
        this.image_map.setBearing(this.degrees);
     }
    hide_image(){

        $("#image_map").hide()
         $("#map").width("100%")
         $("#map").css({'left':"0px"})
          map_manager.map.invalidateSize(true)
    }
 }
 L.Control.Rotate_Button = L.Control.extend({
    options: {
        position: 'topleft'
    },
    onAdd: function (map) {
        var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control rotate_control');
        var button = L.DomUtil.create('a', 'leaflet-control-button', container);
        L.DomEvent.disableClickPropagation(button);
        L.DomEvent.on(button, 'click', function(){
            console.log('click');
        });

        container.title = "Rotate Image";

        return container;
    },
    onRemove: function(map) {},
});
