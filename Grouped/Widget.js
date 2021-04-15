define(['dojo/_base/declare', 'jimu/BaseWidget', 'dojo/_base/lang', 'dojo/dom', 'dojo/dom-class', 'dojo/on', 'dojo/dom-construct', 'dijit/TitlePane', 'dijit/form/DropDownButton', 'dijit/DropDownMenu', 'dijit/Menu', 'dijit/MenuItem', 'dijit/MenuSeparator',
  'dijit/CheckedMenuItem','jimu/LayerInfos/LayerInfos', 'jimu/LayerStructure', 'esri/layers/LayerDrawingOptions', 'jimu/dijit/Popup', 'jimu/dijit/RendererChooser', 'jimu/portalUrlUtils', 'jimu/WidgetManager',
  'dijit/form/HorizontalSlider', 'dijit/form/HorizontalRuleLabels', 'dojo/dom-style', 'esri/request', 'esri/symbols/jsonUtils', 'dijit/Dialog'],
function(declare, BaseWidget, lang, dom, domClass, on, domConstruct, TitlePane, DropDownButton, DropDownMenu, Menu, MenuItem,
         MenuSeparator, CheckedMenuItem, LayerInfos, LayerStructure, LayerDrawingOptions, Popup, RendererChooser, portalUrlUtils,
         WidgetManager, HorizSlider, HorzRuleLabels, domStyle, esriRequest, jsonUtils, Dialog) {
  //To create a widget, you need to derive from BaseWidget.
  return declare([BaseWidget], {
    // DemoWidget code goes here

    //please note that this property is be set by the framework when widget is loaded.
    //templateString: template,
    baseClass: 'jimu-widget-grouped',

    postCreate: function() {
      this.inherited(arguments);
      console.log('postCreate');
    },

    startup: function() {
      this.inherited(arguments);
      this.mapIdNode.innerHTML = 'map id:' + this.map.id;

      //Add groups
      vs = this;
      //Get Groups from the Config
      var groups = vs.config.Groups;
      groups.forEach(function(g){
        vs._buildGroup(g);
      });

      //watch for structure change
      var layerStructure = LayerStructure.getInstance();
      layerStructure.on(LayerStructure.EVENT_STRUCTURE_CHANGE, function(eventObject) {
        // reprint the layer tree if the layer structure has been changed;
        if(eventObject.layerNodes.length >0){
          if(eventObject.type == "added"){
            var layOpt = {};
            eventObject.layerNodes[0].traversal(function(evt){
              if(evt.getSubNodes().length ==0){
                layOpt[evt.id] = {"display": true};
              }
            });

            vs._userAddedLayerFrameword(eventObject.layerNodes[0], layOpt)
          }
        }
      });

      this.own(on(this.map,
          'zoom-end',
          lang.hitch(this, this._onZoomEnd)));

      //Dialog to hold metadata from rest endpoint
      vs.myDialog = new Dialog({
        title: "Metadata",
        style: "width: 400px"
      });
      console.log('startup');
    },

    _onZoomEnd: function(e){
      console.log('zoomEnd');
      var layerInfoArray = [];
      var layerStructure = LayerStructure.getInstance();
      var Groups = vs.config.Groups;

       for (var g in Groups) {
         for (var l in Groups[g].layerOptions){

           var layerNode = layerStructure.getNodeById(l);
           var isInScale = layerNode._layerInfo.isInScale();
           //add code to grey out layer text if false and update visible layers number
           var layerDomID = "label_" + l;
           var layerNameLabelNode = dom.byId(layerDomID);
           if(!isInScale){
             domClass.add(layerNameLabelNode, "outofScale");
           }else{
             domClass.remove(layerNameLabelNode, "outofScale");
           }
         }
       }
    },

    _userAddedLayerFrameword: function(layerInfo, layOpt){
      console.log("User Added Group");

      var g = {
        "name": "User Added Layers",
        "index": 0,
        "layerOptions": layOpt
      };
      g.layerOptions[layerInfo.id] = {"display": true};

      vs._buildGroup(g);
    },

    _buildGroup: function(g){
      //make a title pane for each group
      // var tp = new TitlePane({title: '+ ' + g.name,
      // var groupLayerNumbers = domConstruct.toDom("<div class='visibleNumbers'></div>");
      // dom.byId("holder").appendChild(groupLayerNumbers);
      var tp = new TitlePane({title: g.name + '<div class="visibleNumbers"></div>',
        id: g.name,
        content: "",
        open: false});
      var gllContainer = domConstruct.create("div", null, null, "First");
      domConstruct.place(tp.domNode, gllContainer);
      domConstruct.place(gllContainer, this.domNode);

      tp.startup();
      on(tp,'show', vs._showTitlePane);
      on(tp,'hide', vs._hideTitlePane);


      //find alisa so layer
      var layerStructure = LayerStructure.getInstance();

      vs.visLayerInGroup = 0;
      vs.totalLayersInGroup = 0;
      var object = g.layerOptions;
      groupNode = domConstruct.toDom("<div></div>");
      var row = "";
      for (var property in object) {
        if (object.hasOwnProperty(property)) {
          // Add toggle and layer name
          var aliasLayer = layerStructure.getNodeById(property);

          if (aliasLayer != null){
             //get layer type
            isRoot = aliasLayer.isRoot();

              var sublayers = aliasLayer.getSubNodes().length;
              if (object[property].display && sublayers == 0) {
                var layerDivNode = domConstruct.toDom("<div class='layerDiv'></div>");
                var btnAndLabel = domConstruct.toDom("<div class='layerBTN'></div>");
                var popupMenuStuff = domConstruct.toDom("<div id='" + property + "_GLL_" + "_layer'></div>");
                var onoffSwitchNode = domConstruct.toDom("<div class='onoffswitch'></div>");

                var inputNode = domConstruct.toDom("<input type='checkbox' name='onoffswitch'  class='onoffswitch-checkbox' id='" + property + "switch'>");
                on(inputNode, 'click', vs._toggleLayerVis);
                var inputlabel = domConstruct.toDom("<label class='onoffswitch-label' for='" + property + "switch'><span " +
                  "class='onoffswitch-inner'></span><span class='onoffswitch-switch' data-bind='stopBubble:parentAction'></span></label>");

                var layerTextNode = domConstruct.toDom("<div id='" + "label_" + property + "' class='layerLabel'>" + aliasLayer.title + "</div>");
                var menuBtn = domConstruct.toDom("<div class='layers-list-popupMenu-div' style='display: block'></div>");
                var dropbtn = vs._setMenuOptions(aliasLayer, popupMenuStuff);

                domConstruct.place(inputNode, onoffSwitchNode);
                domConstruct.place(inputlabel, onoffSwitchNode);

                domConstruct.place(onoffSwitchNode, btnAndLabel);
                domConstruct.place(layerTextNode, btnAndLabel);
                // domConstruct.place(dropbtn.domNode, popupMenuStuff);

                domConstruct.place(btnAndLabel, layerDivNode);
                domConstruct.place(popupMenuStuff, layerDivNode);

                domConstruct.place(layerDivNode, groupNode);

                inputNode.checked = aliasLayer.isVisible();
                if(inputNode.checked){
                  vs.visLayerInGroup++;
                }
                vs.totalLayersInGroup++;

              }
          }

        }
      }
      //set visible layers and totatl layers for each Group
      tp.set('Content', groupNode);
      if (vs.config.displayVisLayers){
        tp.set('title', g.name + '<div class="visibleNumbers">' + vs.visLayerInGroup + '/' + vs.totalLayersInGroup + '</div>')
      }

      // console.log(visLayerInGroup + totalLayersInGroup);
    },

    _setMenuOptions: function(layerInfoNode, menuContainerNode){

      layerInfoNode.getLayerType().then(lang.hitch(layerInfoNode, function(layerType){
        //Set up option for layer types
        console.log("Layer Type: " + layerType);
        var RootLayerOnly = ["zoomto", "Transparency", "url"];
        var RasterLayer = [{
            "name": "controlLabels",
            "label": "Toggle labels"
          },{
            "name": "url",
            "label": "Show item details"
          }];
        var WMSLayer = [{
            "name": "controlLabels",
            "label": "Toggle labels"
          },{
            "name": "url",
            "label": "Show item details"
          }];
        var KMLFolderOnly = [
          {
            "name": "url",
            "label": "Show item details"
          }];
        var RootLayerAndFeatureLayer = [
          {
            "name": "zoomto",
            "label": "Zoom to"
          },{
            "name": "Transparency",
            "label": "Transparency"
          },
          {
            "name": "changeSymbology",
            "label": "Change layer symbol"
          },
          {
            "name": "controlPopup",
            "label": "Disable pop-up"
          },{
            "name": "controlLabels",
            "label": "Toggle labels"
          },{
            "name": "url",
            "label": "Show item details"
          }];
        var FeatureLayerOnly =[
        {
          "name": "Transparency",
          "label": "Transparency"
        },{
          "name": "controlPopup",
          "label": "Disable pop-up"
        },{
          "name": "controlLabels",
          "label": "Toggle labels"
        },
          {
          "name": "changeSymbology",
          "label": "Change layer symbol"
        },
          {
          "name": "table",
          "label": "View in attribute table"
        },{
          "name": "url",
          "label": "Show item details"
        }]; //["Disable pop-up", "Toggle labels", "Change layer symbol", "Show item details"];

        var isRootLayer = layerInfoNode.isRoot();
        var menu = new DropDownMenu({ style: "display: none;"});

        if (isRootLayer &&
          (layerType === "FeatureLayer" ||
          layerType === "CSVLayer" ||
          layerType === "ArcGISImageServiceLayer" ||
          layerType === "StreamLayer" ||
          layerType === "ArcGISImageServiceVectorLayer")){

          var i = 0;
          for(var type in RootLayerAndFeatureLayer) {

            if (layerInfoNode.isTiled() && FeatureLayerOnly[type].name == "changeSymbology") {
              //do not add menu item
            } else {
              var menuItem1 = new MenuItem({
                id: layerInfoNode.id + "_" + i,
                label: RootLayerAndFeatureLayer[type].label,
                onClick: lang.hitch(layerInfoNode, vs._layerSubMenuClicked)
              });
              menu.addChild(menuItem1);
            }
            i++;
          }
        }else if (isRootLayer){
          var r = 0;
          for(var type in RootLayerOnly){
            var menuItem1 = new MenuItem({
              id: layerInfoNode.id + "_" + r,
              label: RootLayerOnly[type],
              onClick: function(){ console.log("Error: Rootlayer") }
            });
            menu.addChild(menuItem1);
            r++;
          }
        }else if(layerType === "FeatureLayer" || layerType === "CSVLayer"){
          var index = 0;
          for(var type in FeatureLayerOnly){
            if(layerInfoNode.isTiled() && FeatureLayerOnly[type].name == "changeSymbology"){
              //do not add menu item

            }else if(!layerInfoNode.canShowLabel() && FeatureLayerOnly[type].name == "controlLabels"){

            }else{
              var menuItem1 = new MenuItem({
                id: layerInfoNode.id + "_" + index,
                label: FeatureLayerOnly[type].label,
                onClick: lang.hitch(layerInfoNode, vs._layerSubMenuClicked)
              });
              menu.addChild(menuItem1);
            }

            index++;
          }
        }else if(layerType === "KMLFolder"){
          // var k = 0
          //
          // for(var type in KMLFolderOnly){
          //   var menuItem1 = new MenuItem({
          //     id: layerInfoNode.id + "_" + k,
          //     label: KMLFolderOnly[type].label,
          //     onClick: lang.hitch(layerInfoNode, vs._layerSubMenuClicked)
          //   });
          //   menu.addChild(menuItem1);
          //   k++;
          // }
        }else if(layerType === "WMSLayer"){
          var k = 0
          for(var type in WMSLayer){
            var menuItem1 = new MenuItem({
              id: layerInfoNode.id + "_" + k,
              label: WMSLayer[type].label,
              onClick: lang.hitch(layerInfoNode, vs._layerSubMenuClicked)
            });
            menu.addChild(menuItem1);
            k++;
          }
        }else if(layerType === "RasterLayer"){
          var r = 0
          for(var type in RasterLayer){
            var menuItem1 = new MenuItem({
              id: layerInfoNode.id + "_" + r,
              label: RasterLayer[type].label,
              onClick: lang.hitch(layerInfoNode, vs._layerSubMenuClicked)
            });
            menu.addChild(menuItem1);
            r++;
          }
        }

        var dropbtn = new DropDownButton({
          label: "",
          iconClass: "dijitEditorIcon",
          showLabel: false,
          name: layerInfoNode.id,
          dropDown: menu,
          class: 'drop-Menu-Btn'
        });
        domConstruct.place(dropbtn.domNode, menuContainerNode);
        //console
      }));
    },

    _layerSubMenuClicked: function(evt){
      console.log(evt.target.id);
      var layerID = this.id;
      var layerAction = evt.target.innerText;

      if(layerAction=="Disable pop-up" || layerAction=="Enable pop-up"){
        vs._controlPopups(this, layerID);
        if(layerAction=="Disable pop-up"){
          evt.target.innerText = "Enable pop-up";
        }else{
          evt.target.innerText = "Disable pop-up";
        }
      }else if(layerAction=="Toggle labels"){
        vs._controlLabels(this, layerID);
      }else if(layerAction=="Change layer symbol") {
        vs._changeSymbology(this, layerID);
      }else if(layerAction=="View in attribute table") {
        vs._openTable(this, layerID);
      } else if(layerAction=="Show item details"){
        vs._urlDescription(this, layerID);
      } else if(layerAction=="Transparency"){
        vs._changeTransparency(this, layerID);
      }else if(layerAction=="Zoom to"){
        vs._zoomTo(this, layerID);
      }

    },

    _zoomTo: function (layerInfoNode, layerID){
      console.log("zoom to");
      layerInfoNode._layerInfo.layerObject._zoomConnect;
      layerInfoNode._layerInfo.zoomTo();
    },

    //Layer popup menu functions
    _changeTransparency: function (layerInfoNode, layerID){
      console.log("Transparency");

      if (!vs.transHorizSlider) {
        vs._createTransparencyWidget(layerInfoNode, layerID);
        // vs.transHorizSlider.set("value", layerInfoNode.getOpacity());
      }
    },

    _createTransparencyWidget: function(layerInfoNode, layerID) {
      layerNode = dom.byId(layerID + "_GLL_" + "_layer");

      // var sliderDivContainerNode = domConstruct.create("div", { style: { width: "220px", right: "10px", display: "block" }, class: "popup-menu-transparency-body" }, layerNode.parentElement, "last");
      var sliderDivContainerNode = domConstruct.create("div", { style: { width: "220px", right: "10px", display: "block" }, class: "popup-menu-transparency-body" }, layerNode, "last");
      var sliderLabels = domConstruct.create("div", {class: "label"}, sliderDivContainerNode);
      var sliderDivNode = domConstruct.create("div", null, sliderDivContainerNode);
      var sliderLabelL = domConstruct.create("div", {class: "label-left jimu-float-leading", innerHTML:"Opaque"}, sliderLabels);
      var sliderLabelT = domConstruct.create("div", {class: "label-right jimu-float-trailing", innerHTML:"Transparent"}, sliderLabels);
      var sliderDivBody = domConstruct.create("div", {style: { padding: "0 15px 0 10px" }}, sliderDivContainerNode);
      var sliderDivRulerNode = domConstruct.create("ol", {class: "transparency-rule"}, sliderDivBody);
      var rootlayer = layerInfoNode.getRootNode();
      vs.transHorizSlider = new HorizSlider({
        minimum: 0,
        maximum: 1,
        value: 1 - rootlayer.getOpacity(),
        intermediateChanges: true
      }, sliderDivNode);

      vs.own(vs.transHorizSlider.on("change", lang.hitch(layerInfoNode, function(newTransValue) {
        var rootlayer = this.getRootNode();
        rootlayer.setOpacity(1 - newTransValue);
        // console.log(this.getOpacity())
        // this.setOpacity(newTransValue);

      })));

      vs.horzRuleLabels = new HorzRuleLabels({
        container: "bottomDecoration"
      }, sliderDivRulerNode);
      //Event to destroy the transparency elements once user is done witht them
      on(vs.transHorizSlider, "blur", function(){
        domConstruct.destroy(vs.transHorizSlider.id);
        domConstruct.destroy(vs.horzRuleLabels.id);
        domConstruct.destroy(sliderDivContainerNode);

        vs.transHorizSlider = null;
        vs.horzRuleLabels = null;
        console.log("close Transparency window");
      });


    },

    _openTable: function (layerInfoNode, layerID) {
      layerInfoNode._layerInfo.getSupportTableInfo().then(lang.hitch(this, function (supportTableInfo) {
        var widgetManager;
        var attributeTableWidgetEle =
          this.appConfig.getConfigElementsByName("AttributeTable")[0];
        if (vs._isSupportedByAT(attributeTableWidgetEle, supportTableInfo)) {
          widgetManager = WidgetManager.getInstance();
          widgetManager.triggerWidgetOpen(attributeTableWidgetEle.id)
            .then(lang.hitch(this, function () {
              this.publishData({
                'target': 'AttributeTable',
                'layer': layerInfoNode
              });
            }));
        }
      }));
    },

    _isSupportedByAT: function () {
      return true;
    },

    _urlDescription: function(layerInfoNode, layerID){

      layerInfoNode.getLayerType().then(lang.hitch(layerInfoNode, function(layerType){
        var url;
        var layerUrl = layerInfoNode.getUrl();
        // if (!layerUrl){
        //   layerUrl = layerInfoNode.Url;
        // }
        // may not need the code below
        var basicItemInfo = layerInfoNode.isItemLayer();

        if (basicItemInfo) {
          url = vs._getItemDetailsPageUrl(basicItemInfo) || layerUrl;
        } else if (layerUrl &&
          (layerType === "CSVLayer" || layerType === "KMLLayer")) {
          url = layerUrl;
        } else if (layerUrl && layerType === "WMSLayer") {
          url = layerUrl + (layerUrl.indexOf("?") > -1 ? "&" : "?") + "SERVICE=WMS&REQUEST=GetCapabilities";
        } else if (layerUrl && layerType === "WFSLayer") {
          url = layerUrl + (layerUrl.indexOf("?") > -1 ? "&" : "?") + "SERVICE=WFS&REQUEST=GetCapabilities";
        } else if (layerType === 'KMLFolder'){
          var layerRoot = layerInfoNode.getRootNode();
          var itemUrl = 'https://epa.maps.arcgis.com/home/item.html?id=' + layerRoot._layerInfo.originOperLayer.itemId;
        } else if (layerUrl) {
          url = layerUrl;
        } else {
          url = '';
        }

        //add request to get info about the layer
        // var requestHandle = esriRequest({
        //   "url": layerUrl,
        //   "content": {
        //     "f": "json"
        //   },
        //   "callbackParamName": "callback"
        // });
        // requestHandle.then(requestSucceeded, requestFailed);

        // function requestSucceeded(response){
        //   console.log(response)
        //   //Set vairable from json request
        //
        //   var mtitle = (response["name"] != undefined ? response["name"] : response["mapName"]);
        //   var mDescription = (response["name"] != undefined ? response["description"] : response["serviceDescription"]);
        //   var mCopyright = response["copyrightText"];
        //
        //   var dialogContent = "<div><b>Description:</b> " + mDescription + "</div></br>"
        //       + "<div><b>Copyright:</b> " + mCopyright + "</div></br>";
        //
        //   if(layerUrl.indexOf("utility.arcgis.com") >= 0){
        //
        //   }else{
        //     dialogContent = dialogContent + "<div>" +'<a class="menu-item-description" target="_blank" href="' +
        //         layerUrl + '">' + "See More at the Rest Endpoint" + '</a>' + "</div>";
        //   }
        //
        //   vs.myDialog.set("title", mtitle);
        //   vs.myDialog.set("content",dialogContent);
        //
        //   vs.myDialog.show();
        // }
        // function requestFailed(response, io){
        //   console.log(response)
        // }


        window.open(url, '_blank');
      }));
    },

    _getItemDetailsPageUrl: function(basicItemInfo){
      var itemUrl = "";
      itemUrl = portalUrlUtils.getItemDetailsPageUrl(basicItemInfo.portalUrl, basicItemInfo.itemId);
      return itemUrl;
    },

    _changeSymbology: function(layerInfoNode, layerID){

      layerInfoNode.getLayerObject().then(lang.hitch(layerInfoNode, function(layerObject){
        vs.curLayer = layerObject;

        var symPopup = new Popup({
          titleLabel: 'Change Symbology of '+ layerObject.name,
          autoHeight: true,
          maxWidth: '300px',
          content: '<div id="rendChanger"></div>',
          buttons:[{
            label: 'Update',
            onClick: lang.hitch(this,function(){

              if(vs.curLayer.type =='Feature Layer'){
                try{
                  if(layerInfoNode._layerInfo.parentLayerInfo.layerObject.layerDrawingOptions){
                    var layerRenderer = vs.symbolChooser.getRenderer();
                    layerRenderer.defaultSymbol = null;

                    var layerDrawingOptions = layerInfoNode._layerInfo.parentLayerInfo.layerObject.layerDrawingOptions;
                    var layerDrawingOption = new LayerDrawingOptions();
                    layerDrawingOption.renderer = layerRenderer;
                    layerDrawingOptions[vs.curLayer.layerId] = layerDrawingOption;
                    layerInfoNode._layerInfo.parentLayerInfo.layerObject.setLayerDrawingOptions(layerDrawingOptions);
                  }else{
                    try {
                      var layerRenderer = vs.symbolChooser.getRenderer();
                      layerRenderer.defaultSymbol = null;
                      var optionsArray = [];
                      var layerDrawingOption = new LayerDrawingOptions();
                      layerDrawingOption.renderer = layerRenderer;
                      optionsArray[vs.curLayer.layerId] = layerDrawingOption;
                      layerInfoNode._layerInfo.parentLayerInfo.layerObject.setLayerDrawingOptions(optionsArray);
                    } catch (e) {
                      var layerRenderer = vs.symbolChooser.getRenderer();
                      vs.curLayer.setRenderer(layerRenderer);
                      vs.curLayer.refresh();
                      console.log("symbology changed");
                    }
                  }
                }catch (e) {
                  var layerRenderer = vs.symbolChooser.getRenderer();
                  vs.curLayer.setRenderer(layerRenderer);
                  vs.curLayer.refresh();
                  console.log("symbology changed");
                }

              }else{
                var layerRenderer = vs.symbolChooser.getRenderer();
                vs.curLayer.setRenderer(layerRenderer);
                vs.curLayer.refresh();
                console.log("symbology changed");
              }
            })
          }]
        });

        vs.symChooserNode = domConstruct.toDom("<div style='padding-left: 10px'></div>");
        domConstruct.place(vs.symChooserNode, symPopup.domNode);

        var rend;
        if(vs.curLayer.type =='Feature Layer'){
          try {
            if(layerInfoNode._layerInfo.parentLayerInfo.layerObject.layerDrawingOptions){
            if(layerInfoNode._layerInfo.parentLayerInfo.layerObject.layerDrawingOptions[layerInfoNode.subId]){
              if(layerInfoNode._layerInfo.parentLayerInfo.layerObject.layerDrawingOptions[layerInfoNode.subId].renderer){
                var layerdrawingOps = layerInfoNode._layerInfo.parentLayerInfo.layerObject.layerDrawingOptions;
                rLen = layerdrawingOps.length;
                rend = layerdrawingOps[layerInfoNode.subId].renderer;
                // rend = layerdrawingOps[rLen - 1].renderer;
              }else{
                rend = layerObject.renderer;
              }
            }else{
              rend = layerObject.renderer;
            }
          }else{
            rend = layerObject.renderer;
          }
        } catch (e) {
            rend = layerObject.renderer;
          }

        }else {
          rend = layerObject.renderer;
        }

        if(!rend.defaultSymbol){
          var testSymbol;

          if(rend.infos){
              testSymbol = vs._createdefultSymbol(rend.infos[0].symbol);
              testSymbol.color.a = 0;

              rend.defaultSymbol = testSymbol;

              if(rend.defaultSymbol.type =="picturemarkersymbol"){
                rend.defaultSymbol.setWidth(1);
              }else{
                rend.defaultSymbol.outline.width = 0;
              }
          }else{
             rend.defaultSymbol = rend.getSymbol();
          }
        }

        vs.symbolChooser = new RendererChooser({
          renderer: rend,
          fields:[]
        }, 'rendChanger');
      }));
    },

    _createdefultSymbol: function(dsymbol){

        if(!dsymbol){
          return null;
        }
        var jsonSym = dsymbol.toJson();
        var clone = jsonUtils.fromJson(jsonSym);
        return clone;
    // },
      // if (symbolType.includes("marker")){
      //   return "marker";
      // }else if (symbolType.includes("line")){
      //   return "line";
      // }else if (symbolType.includes("fill")){
      //   return "fill"
      // }
    },

    _controlPopups: function(layerInfoNode, layerID){
      if (layerInfoNode._layerInfo.controlPopupInfo.enablePopup) {
        layerInfoNode._layerInfo.disablePopup();
      } else {
        layerInfoNode._layerInfo.enablePopup();
      }
      layerInfoNode._layerInfo.map.infoWindow.hide();
    },

    _controlLabels: function(layerInfoNode, layerID){
      if (layerInfoNode.isLabelVisble()){
        layerInfoNode.hideLabel();
      } else {
        layerInfoNode.showLabel();
      }
      // var canShowLabels = layerInfoNode.canShowLabel();
      // var drawingOptions = new LayerDrawingOptions();
      // drawingOptions = layerInfoNode._layerInfo.parentLayerInfo.layerObject.layerDrawingOptions;
      // if (drawingOptions.length > 0) {
      //
      //
      //   for (var i = 0; i < drawingOptions.length; i++) {
      //     if (drawingOptions[i].showLabels) {
      //       drawingOptions[i].showLabels = false;
      //     } else {
      //       drawingOptions[i].showLabels = true;
      //     }
      //
      //     if (i == drawingOptions.length - 1) {
      //       layerInfoNode._layerInfo.parentLayerInfo.layerObject.setLayerDrawingOptions(drawingOptions);
      //
      //       layerInfoNode.getLayerObject().then(lang.hitch(layerInfoNode, function(layerObject){
      //         console.log(layerObject);
      //         layerObject.refresh();
      //       }));
      //       //layerInfoNode._layerInfo.layerObject.refresh();
      //     }
      //   }
      // }
    },

    _showPopupMenu: function(layerInfo, popupMenuNode, layerTrNode, evt){
      console.log("Display Popu Menu");
      //And requirments for popu menu
      //Requires layerInfo, popup menu compontent node, and the config

      var Rootlayer = layerInfo.getRootNode();

      if(vs.pMenu){
        vs.pMenu.destroy();
      }

      vs.pMenu = new Menu({
        title: "Actions",
        onBlur: function (){
          console.log("destrio");
          vs.pMenu.destroy();
        }
      }, evt.target);
      vs.pMenu.addChild(new MenuItem({
        label: "Simple menu item"
      }));
      vs.pMenu.addChild(new MenuItem({
        label: "Disabled menu item",
        disabled: true
      }));

      vs.pMenu.startup();

      // var popupMenu = popupMenuNode.popupMenu;
      // if (!popupMenu) {
      //   popupMenu = new PopupMenu({
      //     //items: layerInfo.popupMenuInfo.menuItems,
      //     _layerInfo: layerInfo._layerInfo,
      //     box: null,//this.domNode.parentNode,
      //     popupMenuNode: popupMenuNode,
      //     layerListWidget: this,
      //     _config: this.config
      //   }).placeAt(popupMenuNode);
      //   popupMenuNode.popupMenu = popupMenu;
        // this._storeLayerNodeDijit(rootLayerInfo, popupMenu);
        // var handle = this.own(on(popupMenu, 'onMenuClick', lang.hitch(this, this._onPopupMenuItemClick, layerInfo, popupMenu)));
        //
        // this._storeLayerNodeEventHandle(rootLayerInfo, handle[0]);

      // }
    },

    _showTitlePane: function () {
      //this.set('title', this.title.replace("+ ", "- "));
    },

    _hideTitlePane: function () {
      //this.set('title', this.title.replace("- ", "+ "));
    },

    _toggleLayerVis: function(evt){

      console.log("Make layer visible");
      var layerchkBox = evt.target;
      //get reference to the layer
      var layerStructure = LayerStructure.getInstance();
      var loi = layerchkBox.id.replace('switch','');
      var layerObj = layerStructure.getNodeById(loi);

      //Get the visible numbers div
      var panelID = evt.path ? evt.path[8].id : evt.composedPath()[8].id;
      var queryString = panelID + ' .visibleNumbers';
      //dojo.query('#Issue .visibleNumbers')[0].innerHTML

      // //toggle layer visibility
        if(!layerchkBox.checked){
          // layerchkBox.checked = false;
          if(layerObj.isTiled()){
            vs.map.getLayer(layerObj.getRootNode().id).hide();

          }else{
            layerObj.hide();
          }
        }else{
           // layerchkBox.checked = true;
          if(layerObj.isTiled()){
            vs.map.getLayer(layerObj.getRootNode().id).show();
          }else{
            layerObj.show();
          }
        }
        if (vs.config.displayVisLayers) {
          vs._updateVisibleLayersLbl(panelID);
        }
      //
    },

    _updateVisibleLayersLbl: function(panelID){
      var queryStringCkbx = '#' + panelID + ' .onoffswitch-checkbox';
      var groupCheckboxs = dojo.query(queryStringCkbx);
      var visLayers = 0;
      var nonVisLayers = 0;
      groupCheckboxs.forEach(function (chkbox) {
          if(chkbox.checked){
            visLayers++;
          }else{
            nonVisLayers++;
          }
        })
      var queryString = '#' + panelID + ' .visibleNumbers';
      var panelLabels = dojo.query(queryString)[0];
      panelLabels.innerText = visLayers + '/' + groupCheckboxs.length;
    },

    onOpen: function(){
      console.log('onOpen');
    },

    onClose: function(){
      console.log('onClose');
    },

    onMinimize: function(){
      console.log('onMinimize');
    },

    onMaximize: function(){
      console.log('onMaximize');
    },

    onSignIn: function(credential){
      /* jshint unused:false*/
      console.log('onSignIn');
    },

    onSignOut: function(){
      console.log('onSignOut');
    },

    showVertexCount: function(count){
      this.vertexCount.innerHTML = 'The vertex count is: ' + count;
    }
  });
});
