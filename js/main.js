// main.js
// Главный файл инициализации Vue-приложения. Здесь создается корневой компонент, подключаются все основные компоненты и методы, а также задается шаблон и начальные данные.

document.addEventListener('DOMContentLoaded', () => {
  // Проверка наличия глобальных компонентов (EditorModal, GraphCore)
  if (!window.EditorModal) console.error("EditorModal is not defined!");
  if (!window.GraphCore) console.error("GraphCore is not defined!");

  // Создание Vue-приложения
  const app = Vue.createApp({
    // Подключение компонентов, включая кастомные и глобальные
    components: {
      ...window.GraphCore.components, // Основные компоненты графа
      'context-menu': window.ContextMenu, // Контекстное меню
      'editor-modal': window.EditorModal, // Модальное окно редактора
      'v-network-graph-container': window.VNetworkGraphContainer, // Контейнер графа
      'navigation-bar': window.NavigationBar, // Навигационная панель
      'box-selection-indicator': window.BoxSelectionIndicator // Индикатор выделения
    },
    
    // Методы приложения (основная логика вынесена в GraphCore)
    methods: {
      ...window.GraphCore.methods
    },
    
    // Вычисляемые свойства
    computed: {
      ...window.GraphCore.computed
    },
    
    // Наблюдатели за изменениями
    watch: {
      ...window.GraphCore.watch
    },
    
    // Основной шаблон приложения
    template: `
      <div style="height:100vh; position: relative;" :class="{'creating-edge-mode': creatingEdge.active}">
        <!-- Оверлей загрузки -->
        <div v-if="loading" class="loading-overlay">
          <div class="container"><div class="line"></div></div>
          Загрузка данных...
        </div>
        <!-- Контейнер графа с анимацией -->
        <transition name="fade-layer" mode="out-in">
          <v-network-graph-container
            ref="graph"
            :key="currentLevel + '-' + currentBuilding + '-' + currentFloor"
            :loading="loading"
            v-model:selected-nodes="selectedNodes"
            v-model:selected-edges="selectedEdges"
            :nodes="nodes"
            :edges="edges"
            :layouts="layouts"
            :layers="layers"
            :background-image="backgroundImage"
            :configs-computed="configsComputed"
            :event-handlers="eventHandlers"
            :config-update-key="configUpdateKey"
          />
        </transition>
        <!-- Навигационная панель -->
        <navigation-bar
          :level-history="levelHistory"
          :building-history="buildingHistory"
          :current-floor="currentFloor"
          :go-back="goBack"
          :current-level-name="currentLevelName"
          :current-building="currentBuilding"
          :building-floors="buildingFloors"
          :go-to-floor="goToFloor"
          :current-floor-active="currentFloor"
        />
        <!-- Контекстное меню -->
        <context-menu
          :visible="contextMenu.visible"
          :position="contextMenu.position"
          :items="generateMenuItems()"
        />
        <!-- Индикатор выделения -->
        <box-selection-indicator v-if="isBoxSelectionMode" />
        <!-- Модальное окно редактора -->
        <editor-modal
          v-if="editorModal.visible"
          :visible="editorModal.visible"
          :title="editorModal.title"
          :form-items="editorModal.formItems"
          :initial-form-data="editorModal.initialFormData"
          :preview-function="editorModal.previewFunction"
          @save="editorModal.saveHandler"
          @close="editorModal.visible = false"
        />
      </div>
    `,
    
    // Начальные данные приложения
    data() {
      return {
        currentBuilding: null, // Текущий выбранный корпус/здание
        currentFloor: null, // Текущий этаж
        graphData: null, // Данные графа (загружаются из data.json)
        buildingHistory: [], // История переходов по зданиям
        currentLevel: 'main', // Текущий уровень (основная карта)
        levelHistory: [], // История переходов по уровням
        selectedNodes: [], // Выделенные узлы
        selectedEdges: [], // Выделенные связи
        contextMenu: {
          visible: false, // Видимость контекстного меню
          type: null, // Тип меню (view/node/edge)
          position: { x: 0, y: 0 }, // Позиция меню
          targetId: null // ID целевого объекта
        },
        creatingEdge: {
          active: false, // Режим создания связи
          source: null // Исходный узел для связи
        },
        isBoxSelectionMode: false, // Режим прямоугольного выделения
        editorModal: {
          visible: false, // Видимость модального окна
          title: '', // Заголовок окна
          formItems: [], // Элементы формы
          initialFormData: {}, // Начальные данные формы
          previewFunction: null, // Функция предпросмотра
          saveHandler: null // Обработчик сохранения
        },
        layers: {
          background: "base" // Слой фона
        },
        nodes: {}, // Узлы текущего уровня/этажа
        edges: {}, // Связи текущего уровня/этажа
        layouts: { nodes: {} }, // Расположение узлов
        loading: true, // Флаг загрузки данных
        configUpdateKey: 0, // Ключ для обновления конфигов
        configs: {
          // Конфигурация отображения графа и взаимодействия
          view: {
            scalingObjects: false,
            boxSelectionEnabled: true,
            autoPanAndZoomOnLoad: 'fit-content',
            minZoom: 1,
            maxZoom: 1,
            zoom: 1,
            selection: {
              enabled: true,
              box: {
                color: "#4a90e220",
                strokeWidth: 1,
                strokeColor: "#4a90e2",
                strokeDasharray: "0",
              }
            }
          },
          node: {
            selectable: true,
            draggable: node => node.draggable !== undefined ? node.draggable : true,
            normal: {
              type: node => node.shape || "circle",
              radius: node => node.shape === 'circle' ? (node.size || 16) : 16,
              width: node => node.shape === 'rect' ? ((node.size || 16) * 2) : 32,
              height: node => node.shape === 'rect' ? ((node.size || 16) * 2) : 32,
              borderRadius: node => node.borderRadius || 4,
              strokeWidth: node => node.strokeWidth || 0,
              strokeColor: node => node.strokeColor || "#000000",
              strokeDasharray: node => node.strokeDasharray || "0",
              color: node => node.color || "#4466cc",
            },
            hover: {
              type: node => node.shape || "circle",
              radius: node => node.shape === 'circle' ? (node.size || 16) : 16,
              width: node => node.shape === 'rect' ? ((node.size || 16) * 2) : 32,
              height: node => node.shape === 'rect' ? ((node.size || 16) * 2) : 32,
              borderRadius: node => node.borderRadius || 4,
              strokeWidth: node => node.strokeWidth || 0,
              strokeColor: node => node.strokeColor || "#000000",
              strokeDasharray: node => node.strokeDasharray || "0",
              color: node => node.color || "#dd2288",
            },
            selected: {
              type: node => node.shape || "circle",
              radius: node => node.shape === 'circle' ? (node.size || 16) : 16,
              width: node => node.shape === 'rect' ? ((node.size || 16) * 2) : 32,
              height: node => node.shape === 'rect' ? ((node.size || 16) * 2) : 32,
              borderRadius: node => node.borderRadius || 4,
              strokeWidth: node => node.strokeWidth || 0,
              strokeColor: node => node.strokeColor || "#000000",
              strokeDasharray: node => node.strokeDasharray || "0",
              color: node => node.color || "#4466cc",
            },
            label: { 
              directionAutoAdjustment: true,
              visible: true,
              fontFamily: node => node.fontFamily || "monospace",
              fontSize: node => node.fontSize || 11,
              lineHeight: 1.1,
              color: node => node.fontColor || "#000000",
              margin: 4,
              direction: node => {
                // Преобразуем labelPosition в direction для v-network-graph
                if (node.labelPosition === 'inside') {
                  return 'center';
                }
                return node.labelDirection || 'south';
              },
              background: {
                visible: false,
                color: "#ffffff",
                padding: {
                  vertical: 1,
                  horizontal: 4,
                },
                borderRadius: 2,
              },
              text: node => node.name || node.label || 'name',
            },
            focusring: {
              visible: true,
              width: 4,
              padding: 3,
              color: "#eebb00",
              dasharray: "0",
            },
          },
          edge: {
            selectable: true,
            normal: {
              width: edge => edge.width || 3,
              color: edge => edge.color || "#4466cc",
              dasharray: edge => edge.dasharray || "0",
              linecap: edge => edge.linecap || "butt",
              animate: edge => edge.animate || false,
              animationSpeed: edge => edge.animationSpeed || 50,
            },
            hover: {
              width: edge => edge.width || 4,
              color: edge => edge.color || "#3355bb",
              dasharray: edge => edge.dasharray || "0",
              linecap: edge => edge.linecap || "butt",
              animate: edge => edge.animate || false,
              animationSpeed: edge => edge.animationSpeed || 50,
            },
            selected: {
              width: edge => edge.width || 3,
              color: edge => edge.color || "#dd8800",
              dasharray: edge => edge.dasharray || "6",
              linecap: edge => edge.linecap || "round",
              animate: edge => edge.animate || false,
              animationSpeed: edge => edge.animationSpeed || 50,
            },
            gap: 5,
            type: "straight",
            margin: 2,
            marker: {
              source: {
                type: (...args) => {
                  const edge = args[0][0]; // Первый элемент массива - это объект ребра
                  return edge.sourceMarkerType || "none";
                },
                width: 8,
                height: 8,
                margin: -1,
                offset: 0,
                units: "strokeWidth",
                color: null,
              },
              target: {
                type: (...args) => {
                  const edge = args[0][0]; // Первый элемент массива - это объект ребра
                  return edge.targetMarkerType || "arrow";
                },
                width: 8,
                height: 8,
                margin: -1,
                offset: 0,
                units: "strokeWidth",
                color: null,
              },
            },
            label: {
              visible: edge => !!edge.label,
              fontSize: 11,
              color: edge => edge.color || "#ff0000",
              text: edge => edge.label || '',
              margin: 4,
            },
            summarized: {
              label: {
                fontSize: 10,
                color: "#4466cc",
              },
              shape: {
                type: "rect",
                radius: 6,
                width: 12,
                height: 12,
                borderRadius: 3,
                color: "#ffffff",
                strokeWidth: 1,
                strokeColor: "#4466cc",
                strokeDasharray: "0",
              },
              stroke: {
                width: 5,
                color: "#4466cc",
                dasharray: "0",
                linecap: "butt",
                animate: false,
                animationSpeed: 50,
              }
            }
          }
        }
      };
    },
    
    mounted() {
      // Инициализация приложения и подписка на события жизненного цикла
      this.mountedHandler();
    },
    
    beforeUnmount() {
      // Отписка от событий при размонтировании
      this.beforeUnmountHandler();
    }
  });

  // Подключение сторонней библиотеки графа
  app.use(VNetworkGraph);
  // Монтируем приложение в #app
  app.mount('#app');
});