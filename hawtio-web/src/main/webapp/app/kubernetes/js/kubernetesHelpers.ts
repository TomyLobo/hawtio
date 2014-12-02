/// <reference path="../../fabric/js/fabricGlobals.ts"/>
/// <reference path="../../baseIncludes.ts"/>
/// <reference path="../../baseHelpers.ts"/>
module Kubernetes {

  export var context = '/kubernetes';
  export var hash = '#' + context;
  export var defaultRoute = hash + '/overview';
  export var pluginName = 'Kubernetes';
  export var templatePath = 'app/kubernetes/html/';
  export var log:Logging.Logger = Logger.get(pluginName);

  export var defaultApiVersion = "v1beta2";

  export var appSuffix = ".app";

  export interface KubePod {
    id:string;
    namespace:string;
  }

  export var mbean = Fabric.jmxDomain + ":type=Kubernetes";
  export var managerMBean = Fabric.jmxDomain + ":type=KubernetesManager";

  export function isKubernetes(workspace) {
    return workspace.treeContainsDomainAndProperties(Fabric.jmxDomain, {type: "Kubernetes"});
  }

  export function setJson($scope, id, collection) {
    $scope.id = id;
    if (!$scope.fetched) {
      return;
    }
    if (!id) {
      $scope.json = '';
      return;
    }
    if (!collection) {
      return;
    }
    var item = collection.find((item) => { return item.id === id; });
    if (item) {
      $scope.json = angular.toJson(item, true);
      $scope.item = item;
    } else {
      $scope.id = undefined;
      $scope.json = '';
      $scope.item = undefined;
    }
  }


  /**
   * Returns the labels text string using the <code>key1=value1,key2=value2,....</code> format
   */
  export function labelsToString(labels, seperatorText = ",") {
    var answer = "";
    angular.forEach(labels, (value, key) => {
      var separator = answer ? seperatorText : "";
      answer += separator + key + "=" + value;
    });
    return answer;
  }

  export function initShared($scope, $location) {
    // update the URL if the filter is changed
    $scope.$watch("tableConfig.filterOptions.filterText", (text) => {
      $location.search("q", text);
    });

    $scope.$on("labelFilterUpdate", ($event, text) => {
      var currentFilter = $scope.tableConfig.filterOptions.filterText;
      if (Core.isBlank(currentFilter)) {
        $scope.tableConfig.filterOptions.filterText = text;
      } else {
        var expressions = currentFilter.split(/\s+/);
        if (expressions.any(text)) {
          // lets exclude this filter expression
          expressions = expressions.remove(text);
          $scope.tableConfig.filterOptions.filterText = expressions.join(" ");
        } else {
          $scope.tableConfig.filterOptions.filterText = currentFilter + " " + text;
        }
      }
      $scope.id = undefined;
    });
  }

  /**
   * Given the list of pods lets iterate through them and find all pods matching the selector
   * and return counters based on the status of the pod
   */
  export function createPodCounters(selector, pods) {
    var answer = {
      podsLink: "",
      valid: 0,
      waiting: 0,
      error: 0
    };
    if (selector) {
      answer.podsLink = Core.url("/kubernetes/pods?q=" + encodeURIComponent(Kubernetes.labelsToString(selector, " ")));
      angular.forEach(pods, pod => {
        if (selectorMatches(selector, pod.labels)) {
          var status = (pod.currentState || {}).status;

          if (status) {
            var lower = status.toLowerCase();
            if (lower.startsWith("run")) {
              answer.valid += 1;
            } else if (lower.startsWith("wait")) {
              answer.waiting += 1;
            } else if (lower.startsWith("term") || lower.startsWith("error") || lower.startsWith("fail")) {
              answer.error += 1;
            }
          } else {
            answer.error += 1;
          }
        }
      });
    }
    return answer;
  }

  /**
   * Returns true if the current status of the pod is running
   */
  export function isRunning(podCurrentState) {
    var status = (podCurrentState || {}).status;
    if (status) {
      var lower = status.toLowerCase();
      return lower.startsWith("run");
    } else {
      return false;
    }
  }

  /**
   * Returns true if the labels object has all of the key/value pairs from the selector
   */
  export function selectorMatches(selector, labels) {
    var answer = true;
    angular.forEach(selector, (value, key) => {
      if (answer && labels[key] !== value) {
        answer = false;
      }
    });
    return answer;
  }

}