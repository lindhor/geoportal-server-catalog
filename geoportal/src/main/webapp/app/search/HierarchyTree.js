/* See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * Esri Inc. licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
define(["dojo/_base/declare",
        "dojo/_base/lang",
        "dojo/_base/array",
        "dojo/dom-construct",
        "dojo/topic",
        "app/context/app-topics",
        "dojo/store/Memory",
        "dijit/tree/ObjectStoreModel", 
        "dijit/Tree",
        "dojo/text!./templates/HierarchyTree.html",
        "dojo/i18n!app/nls/resources",
        "app/search/SearchComponent",
        "app/search/DropPane",
        "app/search/QClause",
        "app/search/HierarchyTreeSettings"], 
function(declare, lang, array, domConstruct, topic, appTopics, Memory, ObjectStoreModel, Tree, template, i18n, SearchComponent, 
  DropPane, QClause, HierarchyTreeSettings) {
  
  var oThisClass = declare([SearchComponent], {
    
    i18n: i18n,
    templateString: template,
    
    allowSettings: null,
    field: null,
    label: null,
    open: false,
    props: null,
    
    _initialSettings: null,
    
    // tree structures
    store: null,
    model: null,
    tree: null,
    
    constructor: function() {
      this.inherited(arguments);
      
      this.store = new Memory({
          data: [
              { id: 'world', name:'The earth', type:'planet', population: '6 billion'},
              { id: 'AF', name:'Africa', type:'continent', population:'900 million', area: '30,221,532 sq km',
                      timezone: '-1 UTC to +4 UTC', parent: 'world'},
                  { id: 'EG', name:'Egypt', type:'country', parent: 'AF' },
                  { id: 'KE', name:'Kenya', type:'country', parent: 'AF' },
                      { id: 'Nairobi', name:'Nairobi', type:'city', parent: 'KE' },
                      { id: 'Mombasa', name:'Mombasa', type:'city', parent: 'KE' },
                  { id: 'SD', name:'Sudan', type:'country', parent: 'AF' },
                      { id: 'Khartoum', name:'Khartoum', type:'city', parent: 'SD' },
              { id: 'AS', name:'Asia', type:'continent', parent: 'world' },
                  { id: 'CN', name:'China', type:'country', parent: 'AS' },
                  { id: 'IN', name:'India', type:'country', parent: 'AS' },
                  { id: 'RU', name:'Russia', type:'country', parent: 'AS' },
                  { id: 'MN', name:'Mongolia', type:'country', parent: 'AS' },
              { id: 'OC', name:'Oceania', type:'continent', population:'21 million', parent: 'world'},
              { id: 'EU', name:'Europe', type:'continent', parent: 'world' },
                  { id: 'DE', name:'Germany', type:'country', parent: 'EU' },
                  { id: 'FR', name:'France', type:'country', parent: 'EU' },
                  { id: 'ES', name:'Spain', type:'country', parent: 'EU' },
                  { id: 'IT', name:'Italy', type:'country', parent: 'EU' },
              { id: 'NA', name:'North America', type:'continent', parent: 'world' },
              { id: 'SA', name:'South America', type:'continent', parent: 'world' }
          ],
          getChildren: function(object){
              return this.query({parent: object.id});
          }
      });
      
      this.model = new ObjectStoreModel({
          store: this.store,
          query: {id: 'world'}
      });
      
      this.tree =  new Tree({
          model: this.model
      });
    },
    
    postCreate: function() {
      this.inherited(arguments);
      
      this._initialSettings = {
        label: this.label,
        field: this.field
      };
      if (this.props) {
        this._initialSettings.props = lang.clone(this.props);
      }
      
      if (this.allowSettings === null) {
        if (AppContext.appConfig.search && !!AppContext.appConfig.search.allowSettings) {
          this.allowSettings = true;
        }
      }
      if (this.allowSettings) {
        var link = this.dropPane.addSettingsLink();
        link.onclick = lang.hitch(this,function(e) {
          var d = new HierarchyTreeSettings({
            targetWidget: this
          });
          d.showDialog();
        });
      }
      
      this.own(topic.subscribe(appTopics.AppStarted, lang.hitch(this, function() {
        this.tree.placeAt(this.entriesNode);
        this.tree.startup();
      })));
    },
    
    postMixInProperties: function() {
      this.inherited(arguments);
      if (typeof this.label === "undefined" || this.label === null || this.label.length === 0) {
        this.label = this.field;
      }
    },
    
    addEntry: function(term,count,missingVal) {
//      var name = this.chkName(term);
//      var v = name+" ("+count+")";
//      var tipPattern = i18n.search.appliedFilters.tipPattern;
//      var tip = tipPattern.replace("{type}",this.label).replace("{value}",name);
//      var query = {"term": {}};
//      query.term[this.field] = term;
//      if (typeof missingVal === "string" && missingVal.length > 0 && missingVal === term) {
//        query = {"bool": {"must_not": {"exists": {"field": this.field}}}};
//      }
//      var qClause = new QClause({
//        label: name,
//        tip: tip,
//        parentQComponent: this,
//        removable: true,
//        scorable: true,
//        query: query
//      });
//      var nd = domConstruct.create("div",{},this.entriesNode);
//      var link = domConstruct.create("a",{
//        href: "#",
//        onclick: lang.hitch(this,function() {
//          this.pushQClause(qClause,true);
//        })
//      },nd);
//      this.setNodeText(link,v);
    },
    
    chkName: function(term){
      var name = term;
      if (this.field === "sys_access_groups_s" && typeof name === "string" &&
          AppContext.geoportal.supportsGroupBasedAccess) {
        array.some(AppContext.appUser.getGroups(),function(group){
          if (group.id === name) {
            name = group.name;
            return true;
          }
        });
      }
      return name;
    },
    
    hasField: function() {
      return (typeof this.field !== "undefined" && this.field !== null && this.field.length > 0);
    },
    
    /* SearchComponent API ============================================= */
    
    appendQueryParams: function(params) {
      if (!this.hasField()) return;
      this.appendQClauses(params);
      
      if (!params.aggregations) params.aggregations = {};
      var key = this.getAggregationKey();
      var props = {"field":this.field};
      if (typeof this.props !== "undefined" && this.props !== null) {
        delete this.props.field; // TODO ??
        lang.mixin(props,this.props);
      }
      params.aggregations[key] = {"terms":props};
    },
    
    processResults: function(searchResponse) {
      domConstruct.empty(this.entriesNode);
      var key = this.getAggregationKey();
      if (searchResponse.aggregations) {
        var data = searchResponse.aggregations[key];
        if (data && data.buckets) {
          
          var v, missingVal = null;
          if (this.props && typeof this.props.missing === "string") {
            v = lang.trim(this.props.missing);
            if (v.length > 0) missingVal = v;
          }
          array.forEach(data.buckets,function(entry){
            this.addEntry(entry.key,entry.doc_count,missingVal);
          },this);
        }
      }
    }
    
  });
  
  return oThisClass;
});