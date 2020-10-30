///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 - 2018 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define([
  'dojo/_base/declare',
  'jimu/BaseWidgetSetting',
  'dojo/_base/html',
  'dojox/form/CheckedMultiSelect',
  'dijit/form/ValidationTextBox',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/dom-construct',
  'dojo/dom',
  'dojo/on',
  'dojo/query',
  './LayerSelector',
  'jimu/LayerInfos/LayerInfos',
  'jimu/dijit/CheckBox',
  'jimu/utils'
],
function(declare, BaseWidgetSetting, html, CheckedMultiSelect, ValidationTextBox, _WidgetsInTemplateMixin, domConstruct,
         dom, on, query, LayerSelector, LayerInfos, CheckBox, jimuUtils) {

  return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
    baseClass: 'jimu-widget-wwf-grouped-setting',

    postCreate: function(){
      vm = this;
      vm.NumOfGroups = 0;
      //the config object is passed in
      this.setConfig(this.config);

    },

    _onListContentClicked: function(event){
      //save current
      var currentSelected = query(".item.selected")[0];
      if(currentSelected){
        var item = vm.config.Groups.findIndex(function(element) {
          return element.name == currentSelected.innerText
        });
        vm.config.Groups[item].layerOptions = vm.layerSelector.getLayerOptions();
      }

      var target = event.target || event.srcElement;
      var itemDom = jimuUtils.getAncestorDom(target, function(dom){
        return html.hasClass(dom, 'item');
      }, 3);
      if(!itemDom){
        return;
      }

      if(html.hasClass(target, 'action')){
        if(html.hasClass(target, 'up')){
          if(itemDom.previousElementSibling){
            html.place(itemDom, itemDom.previousElementSibling, 'before');
            var i = vm.config.Groups.findIndex(function(element) {
              return element.name == itemDom.innerText
            });
            var moved = this.config.Groups.splice(i,1);
            var added = this.config.Groups.splice(i-1,0,moved[0]);
          }
        }else if(html.hasClass(target, 'down')){
          if(itemDom.nextElementSibling){
            html.place(itemDom, itemDom.nextElementSibling, 'after');
            var i = vm.config.Groups.findIndex(function(element) {
              return element.name == itemDom.innerText
            });
            var moved = this.config.Groups.splice(i,1);
            var added = this.config.Groups.splice(i+1,0,moved[0]);
          }

        }else if(html.hasClass(target, 'delete')){
          if(this.layerSelector && this.layerSelector.target === itemDom){
            this.layerSelector.destroy();
            this.layerSelector = null;

            var i = vm.config.Groups.findIndex(function(element) {
              return element.name == itemDom.innerText
            });
            var removed = this.config.Groups.splice(i,1);

            console.log(this.config.Groups);
          }
          html.destroy(itemDom);
          var filterItemDoms = query('.item', this.listContent);
          if(filterItemDoms.length > 0){
            this._createGroupSetting(filterItemDoms[0]);
          }
          // this._updateNoQueryTip();
        }
        return;
      }

      if (this.layerSelector) {
        if (this.layerSelector.target !== itemDom) {

          query('.item', this.listContent).removeClass('selected');
          html.addClass(target, 'selected');
          var layerSelectorConfig = this.layerSelector.getLayerOptions();
          if (layerSelectorConfig) {
            this.layerSelector.destroy();
            this.layerSelector = null;
            this._createGroupSetting(itemDom);
          }
        }
      } else {

        this._createGroupSetting(itemDom);
      }
    },

    _onBtnAddItemClicked: function(){
      //Add multi-select and change label name
      console.log("in the onclick");

      if(vm.layerSelector != null){
        var currentSelected = query(".item.selected")[0];
        var item = vm.config.Groups.findIndex(function(element) {
          return element.name == currentSelected.innerText
        });
        vm.config.Groups[item].layerOptions = vm.layerSelector.getLayerOptions();
        vm.layerSelector.destroy();
        vm.layerSelector = null;
      }

      var grpName = vm.grpTxtName.value;
      var target = vm._createTarget(grpName);

      vm.config.Groups.push({
        name: target.innerText,
        index: vm.config.Groups.length,
        layerOptions: null
      });

      vm._createGroupSetting(target);



      vm.grpTxtName.set("value", "");
    },

    _createTarget: function(name){
      name = name || "";
      var target = html.create("div", {
        "class": "item",
        "innerHTML": '<div class="label jimu-ellipsis" title="' + name + '">' + name + '</div>' +
        '<div class="actions jimu-float-trailing">' +
        '<div class="delete action jimu-float-trailing"></div>' +
        '<div class="down action jimu-float-trailing"></div>' +
        '<div class="up action jimu-float-trailing"></div>' +
        '</div>'
      }, this.listContent);

      return target;
    },

    _createGroupSetting: function (target) {

      // query('.item', this.listContent).removeClass('selected');
      var item = vm.config.Groups.find(function(element) {
        return element.name == target.innerText;
      });


      var layerInfosObj = LayerInfos.getInstanceSync();
      vm.layerSelector = new LayerSelector({
        operLayerInfos: layerInfosObj,
        config: item,
        target: target
      }).placeAt(vm.layerSelectorDiv);

      on(vm.layerSelector, 'click', vm._updatedLayerOptions);

      // vm.config.Groups.push({
      //   name: target.innerText,
      //   layer: vm.layerSelector.getLayerOptions()
      // })

      query('.item', this.listContent).removeClass('selected');
      html.addClass(target, 'selected');
    },

    _updatedLayerOptions: function (evt) {
      // console.log("here");
      var currentSelected = dojo.query(".item.selected")[0];
      var item = vm.config.Groups.findIndex(function(element) {
        return element.name == currentSelected.innerText
      });
      vm.config.Groups[item].layerOptions = vm.layerSelector.getLayerOptions();
    },

    setConfig: function(config){
      this.textNode.value = config.configText;
      this.displayVisLayers.setValue(config.displayVisLayers); //config.displayVisLayers
      this.config.Groups = config.Groups;

      this.config.Groups.forEach(function(g, i){
        var s = vm._createTarget(g.name);

        if(i == 0){
          query('.item', this.listContent).removeClass('selected');
          html.addClass(s, 'selected');
        }
        if(vm.layerSelector){
          vm.layerSelector.destroy();
          vm._createGroupSetting(s);
        }else{
          vm._createGroupSetting(s);
        }

      });

    },

    getConfig: function(){
      //WAB will get config object through this method
      vm.config.displayVisLayers = this.displayVisLayers.checked;
      return vm.config;
      // return {
      //   configText: this.textNode.value,
      //   Groups: vm.config.Groups
      // };
    }
  });
});
