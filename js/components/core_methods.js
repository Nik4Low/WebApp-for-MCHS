// core_methods.js
// Основной объект GraphCore содержит методы и логику для работы с графом, навигацией по уровням, редактированием узлов и связей, а также вспомогательные функции для UI.

const GraphCore = {

  methods: {
    // ===================== Навигация по уровням =====================
    // Обработка двойного клика по узлу: переход на childLayer или этаж
    handleNodeDblclick(nodeId) {
      const node = this.nodes[nodeId];
      if (node.childLayer) {
        const nextLayer = node.childLayer;
        
        // Если у уровня есть этажи — переходим в режим здания
        if (this.graphData.levels[nextLayer]?.floors) {
          this.buildingHistory.push({
            level: this.currentLevel,
            building: this.currentBuilding,
            floor: this.currentFloor
          });
          
          this.currentBuilding = nextLayer;
          this.currentFloor = null;
          this.currentLevel = null;
          this.nodes = {};
          this.edges = {};
        } else {
          // Обычный переход на уровень
          this.levelHistory.push(this.currentLevel);
          this.currentLevel = nextLayer;
          
          const levelData = this.graphData.levels[this.currentLevel];
          if (levelData) {
            this.nodes = levelData.nodes || {};
            this.edges = levelData.edges || {};
            this.layouts.nodes = this.graphData.layouts[this.currentLevel] || {};
          }
        }
      }
    },

    // Вернуться назад по истории (этаж, здание, уровень)
    goBack() {
      if (this.currentFloor) {
        this.currentFloor = null;
        this.nodes = {};
        this.edges = {};
      } else if (this.currentBuilding) {
        const prevState = this.buildingHistory.pop();
        
        if (prevState) {
          this.currentLevel = prevState.level;
          this.currentBuilding = prevState.building;
          this.currentFloor = prevState.floor;
          
          if (this.currentFloor) {
            this.goToFloor(this.currentFloor);
          } else if (this.currentLevel) {
            const levelData = this.graphData.levels[this.currentLevel];
            if (levelData) {
              this.nodes = levelData.nodes || {};
              this.edges = levelData.edges || {};
              this.layouts.nodes = this.graphData.layouts[this.currentLevel] || {};
            }
          }
        }
      } else if (this.levelHistory.length > 0) {
        this.currentLevel = this.levelHistory.pop();
        
        const levelData = this.graphData.levels[this.currentLevel];
        if (levelData) {
          this.nodes = levelData.nodes || {};
          this.edges = levelData.edges || {};
          this.layouts.nodes = this.graphData.layouts[this.currentLevel] || {};
        }
      }
    },

    // Перейти на указанный этаж здания
    goToFloor(floorId) {
      this.currentFloor = floorId;
      const floor = this.graphData.levels[this.currentBuilding].floors[floorId];
      
      if (floor) {
        this.nodes = floor.nodes || {};
        this.edges = floor.edges || {};
        
        const layoutKey = `${this.currentBuilding}_${floorId}`;
        this.layouts.nodes = this.graphData.layouts[layoutKey] || {};
      }
    },
    // Выйти из здания (на уровень)
    goBackFromBuilding() {
      if (this.currentFloor) {
        this.currentFloor = null;
      } else {
        this.currentBuilding = null;
        this.currentLevel = this.levelHistory.pop();
      }
    },

    // ===================== Работа с узлами и связями =====================
    // Получить следующий свободный id для узла
    getNextNodeId(nodes) {
      const ids = Object.keys(nodes)
        .filter(id => id.startsWith('node'))
        .map(id => parseInt(id.substring(4)));
      const maxId = ids.length ? Math.max(...ids) : 0;
      return `node${maxId + 1}`;
    },
    
    // Получить следующий свободный id для связи
    getNextEdgeId(edges) {
      const ids = Object.keys(edges)
        .filter(id => id.startsWith('edge'))
        .map(id => parseInt(id.substring(4)));
      const maxId = ids.length ? Math.max(...ids) : 0;
      return `edge${maxId + 1}`;
    },
    
    // Проверить, существует ли связь между двумя узлами
    edgeExists(source, target, edges) {
      return Object.values(edges).some(edge => 
        (edge.source === source && edge.target === target) ||
        (edge.source === target && edge.target === source)
      );
    },
    
    // Есть ли связи между выделенными узлами
    hasEdgesBetweenSelected(selectedNodes, edges) {
      if (selectedNodes.length < 2) return false;
      
      for (let i = 0; i < selectedNodes.length; i++) {
        for (let j = i + 1; j < selectedNodes.length; j++) {
          if (this.edgeExists(selectedNodes[i], selectedNodes[j], edges)) {
            return true;
          }
        }
      }
      return false;
    },

    // Создать связь между двумя узлами
    createEdge(sourceId, targetId, edges) {
      if (sourceId === targetId) return;
      if (this.edgeExists(sourceId, targetId, edges)) return;
      
      const edgeId = this.getNextEdgeId(edges);
      edges[edgeId] = { source: sourceId, target: targetId };
    },
    
    // Создать связи между всеми выделенными узлами
    createEdgesBetweenSelected(selectedNodes, edges) {
      if (selectedNodes.length < 2) return;
      
      for (let i = 0; i < selectedNodes.length; i++) {
        for (let j = i + 1; j < selectedNodes.length; j++) {
          this.createEdge(selectedNodes[i], selectedNodes[j], edges);
        }
      }
    },

    // Удалить узел и все связанные с ним связи
    deleteNode(nodeId, nodes, layouts, edges, selectedNodes, selectedEdges) {
      delete nodes[nodeId];
      delete layouts.nodes[nodeId];
      
      const nodeIndex = selectedNodes.indexOf(nodeId);
      if (nodeIndex !== -1) {
        selectedNodes.splice(nodeIndex, 1);
      }
      
      const edgesToDelete = [];
      for (const edgeId in edges) {
        const edge = edges[edgeId];
        if (edge.source === nodeId || edge.target === nodeId) {
          edgesToDelete.push(edgeId);
        }
      }
      
      edgesToDelete.forEach(edgeId => {
        this.deleteEdge(edgeId, edges, selectedEdges);
      });
    },
    
    // Удалить связь
    deleteEdge(edgeId, edges, selectedEdges) {
      delete edges[edgeId];
      
      const edgeIndex = selectedEdges.indexOf(edgeId);
      if (edgeIndex !== -1) {
        selectedEdges.splice(edgeIndex, 1);
      }
    },
    
    // Удалить все связи между выделенными узлами
    deleteEdgesBetweenSelected(selectedNodes, edges, selectedEdges) {
      if (selectedNodes.length < 2) return;
      
      const edgesToDelete = [];
      for (const edgeId in edges) {
        const edge = edges[edgeId];
        const sourceInSelected = selectedNodes.includes(edge.source);
        const targetInSelected = selectedNodes.includes(edge.target);
        
        if (sourceInSelected && targetInSelected) {
          edgesToDelete.push(edgeId);
        }
      }
      
      edgesToDelete.forEach(edgeId => {
        this.deleteEdge(edgeId, edges, selectedEdges);
      });
    },
    
    // Удалить выделенные связи
    deleteSelectedEdges(selectedEdges, edges) {
      const edgesToDelete = [...selectedEdges];
      edgesToDelete.forEach(edgeId => {
        delete edges[edgeId];
        const index = selectedEdges.indexOf(edgeId);
        if (index !== -1) {
          selectedEdges.splice(index, 1);
        }
      });
    },
    
    // Удалить выделенные узлы
    deleteSelectedNodes(selectedNodes, nodes, layouts, edges, selectedEdges) {
      const nodesToDelete = [...selectedNodes];
      nodesToDelete.forEach(nodeId => {
        this.deleteNode(nodeId, nodes, layouts, edges, selectedNodes, selectedEdges);
      });
      selectedNodes.length = 0;
    },

    // ===================== Контекстное меню =====================
    // Показать контекстное меню
    showContextMenu(type, event, targetId) {
      this.contextMenu = {
        visible: true,
        type,
        position: { 
          x: event.clientX, 
          y: event.clientY 
        },
        targetId
      };
    },
    
    // Скрыть контекстное меню
    hideContextMenu() {
      this.contextMenu.visible = false;
    },
    
    // Контекстное меню для области
    handleViewContextMenu(event) {
      event.event.preventDefault();
      this.showContextMenu('view', event.event, null);
    },
    // Контекстное меню для узла
    handleNodeContextMenu(event) {
      event.event.preventDefault();
      this.showContextMenu('node', event.event, event.node);
    },
    // Контекстное меню для связи
    handleEdgeContextMenu(event) {
      event.event.preventDefault();
      this.showContextMenu('edge', event.event, event.edge);
    },
    
    handleViewClick({ event }) {
      // Обработка клика по пустой области графа
      // Если был активен режим создания связи — сбрасываем его
      if (this.creatingEdge.active) {
        this.creatingEdge.active = false;
      } else {
        // Снимаем выделение со всех узлов
        this.selectedNodes = [];
      }
      // Снимаем выделение со всех связей
      this.selectedEdges = [];
      this.hideContextMenu();
    },
    
    handleNodeClick(event) {
      // Обработка клика по узлу
      if (this.creatingEdge.active) {
        // Если активен режим создания связи — создаём связь между source и target
        const sourceId = this.creatingEdge.source;
        const targetId = event.node;
        
        if (this.layouts.nodes[sourceId] && this.layouts.nodes[targetId]) {
          const edgeId = this.getNextEdgeId(this.edges);
          this.edges[edgeId] = {
            source: sourceId,
            target: targetId
          };
        }
        
        this.creatingEdge.active = false;
        this.hideContextMenu();
      } else {
        // Просто скрываем контекстное меню
        this.hideContextMenu();
      }
    },
    
    handleViewMode(mode) {
      // Включение/выключение режима прямоугольного выделения
      this.isBoxSelectionMode = mode === 'box-selection';
    },

    // ===================== Редактор узлов и связей =====================
    openEditor(config) {
      // Открыть модальное окно редактора с заданной конфигурацией
      this.editorModal = {
        visible: true,
        title: config.title,
        formItems: config.formItems,
        initialFormData: config.initialFormData,
        previewFunction: config.previewFunction,
        saveHandler: config.saveHandler
      };
    },
    
    openNodeEditor(nodeId) {
      // Открыть редактор для выбранного узла
      const node = this.nodes[nodeId] || {};
      // Новый список иконок только с классами FontAwesome
      const fontAwesomeIcons = [
        { value: 'fa-solid fa-address-card', label: 'Address Card' },
        { value: 'fa-regular fa-hard-drive', label: 'Hard Drive' },
        { value: 'fa-regular fa-folder-closed', label: 'Folder Closed' },
        { value: 'fa-brands fa-pied-piper-hat', label: 'Pied Piper Hat' },
        { value: 'fa-solid fa-wifi', label: 'WiFi' },
        { value: 'fa-solid fa-key', label: 'Key' },
        { value: 'fa-solid fa-print', label: 'Print' },
        { value: 'fa-solid fa-database', label: 'Database' },
        { value: 'fa-solid fa-desktop', label: 'Desktop' },
      ];
      let iconValue = node.icon;
      const found = fontAwesomeIcons.find(i => i.value === node.icon);
      if (found) iconValue = found.value;
      this.openEditor({
        title: 'Редактирование узла',
        formItems: this.getNodeFormItems(),
        initialFormData: { 
          id: nodeId,
          name: node.name || '',
          color: node.color || "#ff9e6d",
          shape: node.shape || "circle",
          icon: iconValue,
          hideIcon: node.hideIcon || false,
          draggable: node.draggable !== undefined ? node.draggable : true,
          size: node.size || 18,
          borderRadius: node.borderRadius || 4,
          strokeWidth: node.strokeWidth || 0,
          strokeColor: node.strokeColor || "#000000",
          strokeDasharray: node.strokeDasharray || "0",
          labelDirection: node.labelDirection || 'south',
          labelPosition: node.labelPosition || 'outside'
        },
        previewFunction: (formData) => this.getNodePreview(formData),
        saveHandler: (formData) => {
          this.saveNodeChanges(formData);
        }
      });
      this.hideContextMenu();
    },
    
    openEdgeEditor(edgeId) {
      // Открыть редактор для выбранной связи
      const edge = this.edges[edgeId] || {};
      
      this.openEditor({
        title: 'Редактирование связи',
        formItems: this.getEdgeFormItems(),
        initialFormData: {
          id: edgeId,
          label: edge.label || '',
          color: edge.color || "#ff00dd",
          width: edge.width || 3,
          dasharray: edge.dasharray || "0",
          linecap: edge.linecap || "butt",
          animate: edge.animate || false,
          animationSpeed: edge.animationSpeed || 50,
          sourceMarkerType: edge.sourceMarkerType || 'none',
          targetMarkerType: edge.targetMarkerType || 'arrow'
        },
        previewFunction: this.getEdgePreview,
        saveHandler: (formData) => {
          this.saveEdgeChanges(formData);
        }
      });
      this.hideContextMenu();
    },
    
    saveNodeChanges(formData) {
      // Сохранить изменения узла из формы редактора
      console.log('[saveNodeChanges] formData:', formData);
      const nodeId = formData.id;
      
      // Создаем новый объект для реактивности
      const updatedNode = {
        ...this.nodes[nodeId],
        ...formData
      };
      
      // Обновляем узел
      this.nodes[nodeId] = updatedNode;
      
      // Принудительно обновляем конфигурацию для реактивности
      this.configs = { ...this.configs };
      
      // Принудительно обновляем данные узлов
      this.nodes = { ...this.nodes };
      
      this.editorModal.visible = false;
    },
    
    saveEdgeChanges(formData) {
      // Сохранить изменения связи из формы редактора
      const edgeId = formData.id;
      
      // Создаем новый объект для реактивности
      const updatedEdge = {
        ...this.edges[edgeId],
        ...formData
      };
      
      // Сохраняем source и target
      const source = this.edges[edgeId].source;
      const target = this.edges[edgeId].target;
      
      // Обновляем ребро реактивно для Vue3
      this.edges[edgeId] = {
        source: source,
        target: target,
        ...updatedEdge
      };
      
      // Принудительно обновляем объект edges для реактивности
      this.edges = { ...this.edges };
      
      // Принудительно обновляем конфигурацию для перерисовки маркеров
      this.configs = { ...this.configs };
      
      // Принудительно перерисовываем граф
      this.configUpdateKey++;
      
      this.editorModal.visible = false;
    },
  
    getNodeFormItems() {
      // Новый список иконок только с классами FontAwesome
      const fontAwesomeIcons = [
        { value: 'fa-solid fa-address-card' },
        { value: 'fa-regular fa-hard-drive' },
        { value: 'fa-regular fa-folder-closed' },
        { value: 'fa-brands fa-pied-piper-hat' },
        { value: 'fa-solid fa-wifi' },
        { value: 'fa-solid fa-key' },
        { value: 'fa-solid fa-print' },
        { value: 'fa-solid fa-database' },
        { value: 'fa-solid fa-desktop' }
      ];
      console.log('[getNodeFormItems] IconField options:', fontAwesomeIcons);
      return [
        {
          tab: 'main',
          component: 'TextField',
          key: 'name',
          props: {
            label: 'Название',
            placeholder: 'Введите название'
          }
        },
        {
          tab: 'styles',
          component: 'ShapeField',
          key: 'shape',
          props: {
            label: 'Форма',
            options: [
              { value: 'circle' },
              { value: 'rect' }
            ]
          }
        },
        {
          tab: 'main',
          component: 'IconField',
          key: 'icon',
          props: {
            label: 'Иконка',
            options: fontAwesomeIcons,
            fontAwesomeMap: window.fontAwesomeMap
          }
        },
        {
          tab: 'main',
          component: 'CheckboxField',
          key: 'hideIcon',
          props: {
            label: 'Скрыть иконку'
          }
        },
        {
          tab: 'main',
          component: 'CheckboxField',
          key: 'draggable',
          props: {
            label: 'Перетаскиваемый'
          }
        },
        {
          tab: 'styles',
          component: 'NumberField',
          key: 'size',
          props: {
            label: 'Размер',
            min: 5,
            max: 100,
            step: 5
          }
        },
        {
          tab: 'styles',
          component: 'NumberField',
          key: 'borderRadius',
          props: {
            label: 'Радиус скругления',
            min: 0,
            max: 20,
            step: 1
          }
        },
        {
          tab: 'styles',
          component: 'ColorField',
          key: 'color',
          props: {
            label: 'Цвет',
            options: [
              '#ff9e6d', '#4caf50', '#2196f3', '#9c27b0', 
              '#ff9800', '#e91e63', '#00bcd4', '#8bc34a'
            ]
          }
        },
        {
          tab: 'styles',
          component: 'NumberField',
          key: 'strokeWidth',
          props: {
            label: 'Ширина обводки',
            min: 0,
            max: 20,
            step: 1
          }
        },
        {
          tab: 'styles',
          component: 'ColorField',
          key: 'strokeColor',
          props: {
            label: 'Цвет обводки',
            options: [
              '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
              '#ffff00', '#00ffff', '#ff00ff', '#ff7700', '#aa00ff'
            ]
          }
        },
        {
          tab: 'styles',
          component: 'SelectField',
          key: 'strokeDasharray',
          props: {
            label: 'Пунктир обводки',
            options: [
              { value: '0', label: 'Сплошная линия' },
              { value: '2,2', label: 'Мелкий пунктир' },
              { value: '4,4', label: 'Средний пунктир' },
              { value: '8,8', label: 'Крупный пунктир' },
              { value: '2,4', label: 'Точка-тире' },
              { value: '1,1', label: 'Точечный пунктир' }
            ]
          }
        }, 
        {
          tab: 'text',
          component: 'SelectField',
          key: 'labelDirection',
          props: {
            label: 'Направление метки',
            options: [
              { value: 'north', label: 'Север (вверх)' },
              { value: 'south', label: 'Юг (вниз)' },
              { value: 'east', label: 'Восток (вправо)' },
              { value: 'west', label: 'Запад (влево)' },
              { value: 'north-east', label: 'Северо-восток' },
              { value: 'north-west', label: 'Северо-запад' },
              { value: 'south-east', label: 'Юго-восток' },
              { value: 'south-west', label: 'Юго-запад' },
              { value: 'center', label: 'Центр' }
            ]
          }
        },
        {
          tab: 'text',
          component: 'SelectField',
          key: 'labelPosition',
          props: {
            label: 'Положение текста',
            options: [
              { value: 'inside', label: 'Внутри узла' },
              { value: 'outside', label: 'Снаружи узла' }
            ]
          }
        },
        {
          tab: 'text',
          component: 'FontField',
          key: 'fontFamily',
          props: {
            label: 'Семейство шрифта',
            options: [
              { value: 'monospace', label: 'Monospace' },
              { value: 'Arial, sans-serif', label: 'Arial' },
              { value: 'Times New Roman, serif', label: 'Times New Roman' },
              { value: 'Georgia, serif', label: 'Georgia' },
              { value: 'Verdana, sans-serif', label: 'Verdana' },
              { value: 'Courier New, monospace', label: 'Courier New' },
              { value: 'Trebuchet MS, sans-serif', label: 'Trebuchet MS' },
              { value: 'Impact, sans-serif', label: 'Impact' },
              { value: 'Comic Sans MS, cursive', label: 'Comic Sans MS' },
              { value: 'Tahoma, sans-serif', label: 'Tahoma' }
            ]
          }
        },
        {
          tab: 'text',
          component: 'ColorField',
          key: 'fontColor',
          props: {
            label: 'Цвет шрифта',
            options: [
              '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
              '#ffff00', '#00ffff', '#ff00ff', '#ff7700', '#aa00ff',
              '#333333', '#666666', '#999999', '#cccccc', '#ff6600'
            ]
          }
        },
        {
          tab: 'text',
          component: 'NumberField',
          key: 'fontSize',
          props: {
            label: 'Размер шрифта',
            min: 8,
            max: 24,
            step: 1
          }
        },                 
      ];
    },
    
    getEdgeFormItems() {
      return [
        {
          tab: 'text',      
          component: 'TextField',
          key: 'label',
          props: {
            label: 'Метка',
            placeholder: 'Введите метку'
          }
        },
        {
          tab: 'main',      
          component: 'NumberField',
          key: 'width',
          props: {
            label: 'Ширина линии',
            min: 1,
            max: 20,
            step: 1
          }
        },
        {
          tab: 'styles',      
          component: 'ColorField',
          key: 'color',
          props: {
            label: 'Цвет',
            options: [
              '#ff0000', '#00ff00', '#0000ff', '#ffff00', 
              '#00ffff', '#ff00ff', '#ff7700', '#aa00ff'
            ]
          }
        },
        {
          tab: 'styles',      
          component: 'SelectField',
          key: 'dasharray',
          props: {
            label: 'Пунктир линии',
            options: [
              { value: '0', label: 'Сплошная линия' },
              { value: '2,2', label: 'Мелкий пунктир' },
              { value: '4,4', label: 'Средний пунктир' },
              { value: '8,8', label: 'Крупный пунктир' },
              { value: '2,4', label: 'Точка-тире' },
              { value: '1,1', label: 'Точечный пунктир' }
            ]
          }
        },
        {
          tab: 'styles',      
          component: 'SelectField',
          key: 'linecap',
          props: {
            label: 'Тип окончания линии',
            options: [
              { value: 'butt', label: 'Прямое' },
              { value: 'round', label: 'Скругленное' },
              { value: 'square', label: 'Квадратное' }
            ]
          }
        },
        {
          tab: 'styles',      
          component: 'CheckboxField',
          key: 'animate',
          props: {
            label: 'Анимация'
          }
        },
        {
          tab: 'styles',      
          component: 'RangeField',
          key: 'animationSpeed',
          props: {
            label: 'Скорость анимации',
            min: 10,
            max: 200,
            step: 10
          }
        },
        {
          tab: 'styles',      
          component: 'DividerField',
          key: 'markerDivider',
          props: {
            label: 'Наконечники (маркеры)'
          }
        },
        {
          tab: 'markers',      
          component: 'SelectField',
          key: 'sourceMarkerType',
          props: {
            label: 'Тип наконечника начала',
            options: [
              { value: 'none', label: 'Нет' },
              { value: 'arrow', label: 'Стрелка' },
              { value: 'angle', label: 'Угол' },
              { value: 'circle', label: 'Круг' }
            ]
          }
        },
        {
          tab: 'markers',      
          component: 'SelectField',
          key: 'targetMarkerType',
          props: {
            label: 'Тип наконечника конца',
            options: [
              { value: 'none', label: 'Нет' },
              { value: 'arrow', label: 'Стрелка' },
              { value: 'angle', label: 'Угол' },
              { value: 'circle', label: 'Круг' }
            ]
          }
        },
      ];
    },
    
    getNodePreview(formData) {
      const size = formData.size || 18;
      const color = formData.color || '#ff9e6d';
      const strokeWidth = formData.strokeWidth || 0;
      const strokeColor = formData.strokeColor || '#000000';
      const strokeDasharray = formData.strokeDasharray || '0';
      const borderRadius = formData.borderRadius || 4;
      const labelPosition = formData.labelPosition || 'outside';
      const fontFamily = formData.fontFamily || 'monospace';
      const fontColor = formData.fontColor || (labelPosition === 'inside' ? '#ffffff' : '#000000');
      const fontSize = formData.fontSize || 11;
      // Генерация HTML для иконки с использованием foreignObject
      let iconHtml = '';
      if (!formData.hideIcon && formData.icon) {
        const iconSize = Math.min(size * 1.5, 32);
        iconHtml = `
          <foreignObject 
            x="${50 - size}" 
            y="${50 - size}" 
            width="${size * 2}" 
            height="${size * 2}"
            style="overflow: visible;"
          >
            <div 
                 style="width:100%; height:100%; display:flex; align-items:center; justify-content:center;">
              <i class="${formData.icon}" style="font-size:${iconSize}px; color: white;"></i>
            </div>
          </foreignObject>
        `;
      }
      const textY = labelPosition === 'inside' ? 50 : (50 + size + 15);
      const textElement = `<text
                x="50"
                y="${textY}"
                font-family="${fontFamily}"
                font-size="${fontSize}"
                fill="${fontColor}"
                text-anchor="middle"
                dominant-baseline="central"
            >${formData.name || 'Узел'}</text>`;
      if (formData.shape === 'rect') {
        return `
            <svg width="100" height="100" viewBox="0 0 100 100">
            <rect 
                x="${50 - size}" 
                y="${50 - size}" 
                width="${size * 2}" 
                height="${size * 2}" 
                rx="${borderRadius}" 
                fill="${color}" 
                stroke="${strokeColor}"
                stroke-width="${strokeWidth}"
                stroke-dasharray="${strokeDasharray}"
            />
            ${iconHtml}
            ${textElement}
            </svg>
        `;
      } else {
        return `
            <svg width="100" height="100" viewBox="0 0 100 100">
            <circle 
                cx="50" 
                cy="50" 
                r="${size}" 
                fill="${color}" 
                stroke="${strokeColor}"
                stroke-width="${strokeWidth}"
                stroke-dasharray="${strokeDasharray}"
            />
            ${iconHtml}
            ${textElement}
            </svg>
        `;
      }
    },
    
    getEdgePreview(formData) {
        const dasharray = formData.dasharray || (formData.animate ? "4" : "0");
        const color = formData.color || '#4466cc';
        const width = formData.width || 3;
        const linecap = formData.linecap || 'butt';
        const animationSpeed = formData.animationSpeed || 50;
        const animationStyle = formData.animate ? 
        `animation: v-ng-dash ${2000 / animationSpeed}s linear infinite;` : "";
        
        // Marker settings
        const sourceMarkerType = formData.sourceMarkerType || 'none';
        const targetMarkerType = formData.targetMarkerType || 'arrow';
        
        // Generate marker definitions
        let markerDefs = '';
        if (sourceMarkerType !== 'none') {
          markerDefs += `
            <defs>
              <marker id="source-marker" markerWidth="10" markerHeight="10" 
                      refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                ${this.getMarkerPath(sourceMarkerType, color)}
              </marker>
            </defs>
          `;
        }
        if (targetMarkerType !== 'none') {
          markerDefs += `
            <defs>
              <marker id="target-marker" markerWidth="10" markerHeight="10" 
                      refX="0" refY="3" orient="auto" markerUnits="strokeWidth">
                ${this.getMarkerPath(targetMarkerType, color)}
              </marker>
            </defs>
          `;
        }
        
        return `
        <svg width="200" height="50" viewBox="0 0 200 50">
            <defs>
            <style>
                @keyframes v-ng-dash {
                to { stroke-dashoffset: 0; }
                }
                .animated-line {
                stroke-dasharray: ${dasharray};
                stroke-dashoffset: 100;
                ${animationStyle}
                }
            </style>
            ${markerDefs}
            </defs>
            <line 
            x1="20" y1="25" x2="180" y2="25" 
            stroke="${color || '#000000'}" 
            stroke-width="${width || 1}"
            stroke-linecap="${linecap || 'butt'}"
            stroke-dasharray="${dasharray || '0'}"
            class="${formData.animate ? 'animated-line' : ''}"
            marker-start="${sourceMarkerType !== 'none' ? 'url(#source-marker)' : ''}"
            marker-end="${targetMarkerType !== 'none' ? 'url(#target-marker)' : ''}"
            />
            <text x="100" y="20" text-anchor="middle" fill="${color}">
            ${formData.label || ''}
            </text>
        </svg>
        `;
    },
    
    getMarkerPath(markerType, color) {
      switch (markerType) {
        case 'arrow':
          return `<path d="M0,0 L0,8 L8,4 z" fill="${color}" />`;
        case 'angle':
          return `<path d="M0,0 L8,0 L8,8 z" fill="${color}" />`;
        case 'circle':
          return `<circle cx="4" cy="4" r="4" fill="${color}" />`;
        default:
          return '';
      }
    },
    
    // ===================== Действия с элементами =====================
    handleAddNode() {
      const graph = this.$refs.graph;
      if (!graph) return;
      
      const rect = graph.$el.getBoundingClientRect();
      const x = this.contextMenu.position.x - rect.left;
      const y = this.contextMenu.position.y - rect.top;
      
      const safeX = Math.max(0, x);
      const safeY = Math.max(0, y);
      
      try {
        const svgPoint = graph.translateFromDomToSvgCoordinates({ x: safeX, y: safeY });
        
        if (isNaN(svgPoint.x) || isNaN(svgPoint.y)) {
          console.error("Invalid coordinates:", svgPoint);
          return;
        }
        
        const nodeId = this.getNextNodeId(this.nodes);
        const name = `Point ${nodeId.substring(4)}`;
        
        const icons = [
          'fa-solid fa-address-card',
          'fa-regular fa-hard-drive',
          'fa-regular fa-folder-closed',
          'fa-brands fa-pied-piper-hat',
          'fa-solid fa-wifi',
          'fa-solid fa-key',
          'fa-solid fa-print',
          'fa-solid fa-database',
          'fa-solid fa-desktop',
        ];
        const randomIcon = icons[Math.floor(Math.random() * icons.length)];
        
          if (!this.graphData.levels[this.currentLevel]) {
          this.graphData.levels[this.currentLevel] = {
            background: this.backgroundImage,
            nodes: {},
            edges: {}
          };
        }
        
        this.graphData.levels[this.currentLevel].nodes[nodeId] = { 
          name, 
          icon: randomIcon,
          shape: "circle",
          color: "#ff9e6d",
          size: 18,
          draggable: true,
          labelDirection: 'south',
          labelPosition: 'outside',
          fontFamily: 'monospace',
          fontColor: '#000000',
          fontSize: 11
        };
        
        if (!this.graphData.layouts[this.currentLevel]) {
          this.graphData.layouts[this.currentLevel] = {};
        }
        this.graphData.layouts[this.currentLevel][nodeId] = svgPoint;

        this.nodes = { ...this.graphData.levels[this.currentLevel].nodes };
        this.layouts.nodes = { ...this.graphData.layouts[this.currentLevel] };

        this.hideContextMenu();
      } catch (error) {
        console.error("Error adding node:", error);
      }
    },
    
    handleCreateEdge(targetId) {
      this.creatingEdge = {
        active: true,
        source: targetId
      };
      this.hideContextMenu();
    },
    
    handleDeleteNode(targetId) {
      this.deleteNode(
        targetId, 
        this.nodes, 
        this.layouts, 
        this.edges, 
        this.selectedNodes,
        this.selectedEdges
      );
      this.hideContextMenu();
    },
    
    handleDeleteEdge(targetId) {
      this.deleteEdge(targetId, this.edges, this.selectedEdges);
      this.hideContextMenu();
    },
    
    handleCreateEdges() {
      this.createEdgesBetweenSelected(this.selectedNodes, this.edges);
      this.hideContextMenu();
    },
    
    handleDeleteEdges() {
      this.deleteEdgesBetweenSelected(
        this.selectedNodes, 
        this.edges,
        this.selectedEdges
      );
      this.hideContextMenu();
    },
    
    handleDeleteSelectedEdges() {
      this.deleteSelectedEdges(this.selectedEdges, this.edges);
      this.hideContextMenu();
    },
    
    handleStartBoxSelection() {
      this.$refs.graph?.startBoxSelection();
      this.hideContextMenu();
    },
    
    handleDeleteSelectedNodes() {
      this.deleteSelectedNodes(
        this.selectedNodes,
        this.nodes,
        this.layouts,
        this.edges,
        this.selectedEdges
      );
      this.hideContextMenu();
    },
    
    handleReverseEdge(edgeId) {
      const edge = this.edges[edgeId];
      if (edge) {
        const newEdge = { ...edge, source: edge.target, target: edge.source };
        this.edges[edgeId] = newEdge;
        // Принудительно обновляем edges для реактивности
        this.edges = { ...this.edges };
      }
      this.hideContextMenu();
    },
    
    generateMenuItems() {
      if (!this.contextMenu.visible) return [];
      
      const { type, targetId } = this.contextMenu;
      const items = [];
      
      if (type === 'view') {
        items.push({ label: 'Добавить узел', action: this.handleAddNode });
        items.push({ divider: true });
        
        if (this.selectedNodes.length >= 2) {
          items.push({ 
            label: `Удалить выделенные узлы (${this.selectedNodes.length})`, 
            action: this.handleDeleteSelectedNodes 
          });
          
          const hasEdges = this.hasEdgesBetweenSelected(this.selectedNodes, this.edges);
          if (!hasEdges) {
            items.push({ 
              label: 'Создать связи между выделенными узлами', 
              action: this.handleCreateEdges 
            });
          } else {
            items.push({ 
              label: 'Удалить связи между выделенными узлами', 
              action: this.handleDeleteEdges 
            });
          }
          items.push({ divider: true });
        }
        
        if (this.selectedEdges.length > 0) {
          items.push({ 
            label: `Удалить выделенные связи (${this.selectedEdges.length})`, 
            action: this.handleDeleteSelectedEdges 
          });
          items.push({ divider: true });
        }
        
        items.push({ 
          label: 'Начать выделение прямоугольником', 
          action: this.handleStartBoxSelection 
        });
      }
      else if (type === 'node') {
        if (this.selectedNodes.length === 1) {
          items.push({ 
            label: 'Создать связь', 
            action: () => this.handleCreateEdge(targetId) 
          });
        }
        
        items.push({ 
          label: 'Удалить узел', 
            action: () => this.handleDeleteNode(targetId) 
          });
          
          items.push({ 
            label: 'Редактировать узел', 
            action: () => this.openNodeEditor(targetId) 
          });
          
          if (this.selectedNodes.length >= 2) {
            items.push({ divider: true });
            items.push({ 
              label: `Удалить выделенные узлы (${this.selectedNodes.length})`, 
              action: this.handleDeleteSelectedNodes 
            });
            
            const hasEdges = this.hasEdgesBetweenSelected(this.selectedNodes, this.edges);
            if (!hasEdges) {
              items.push({ 
                label: 'Создать связи между выделенными узлами', 
                action: this.handleCreateEdges 
              });
            } else {
              items.push({ 
                label: 'Удалить связи между выделенными узлами', 
                action: this.handleDeleteEdges 
              });
            }
          }
        }
        else if (type === 'edge') {
          items.push({ 
            label: 'Редактировать связь', 
            action: () => this.openEdgeEditor(targetId) 
          });
          items.push({ 
            label: 'Развернуть связь (поменять source и target)',
            action: () => this.handleReverseEdge(targetId)
          });
          items.push({ 
            label: 'Удалить связь', 
            action: () => this.handleDeleteEdge(targetId) 
          });
          
          if (this.selectedEdges.length > 1) {
            items.push({ divider: true });
            items.push({ 
              label: `Удалить выделенные связи (${this.selectedEdges.length})`, 
              action: this.handleDeleteSelectedEdges 
            });
          }
        }
        
        return items;
    },

    // Метод инициализации приложения
    async initApp() {
      try {
        const response = await fetch('js/data.json');
        if (!response.ok) throw new Error('Ошибка загрузки данных');
        this.graphData = await response.json();
        // Искусственная задержка для показа анимации
        await new Promise(resolve => setTimeout(resolve, 800));
        this.loading = false;
        this.$nextTick(() => {
          this.$refs.graph?.fitToContents();
        });
      } catch (error) {
        console.error('Ошибка загрузки data:', error);
        this.loading = false;
      }
    },
    
    
    // Обработчики жизненного цикла
    mountedHandler() {
      document.addEventListener('click', this.hideContextMenu);
      this.initApp();
    },
    
    beforeUnmountHandler() {
      document.removeEventListener('click', this.hideContextMenu);
    },
  

},

  computed: {
    // Вычисляемые свойства
    configsComputed() {
      const configs = {
        ...this.configs,
        node: {
          ...this.configs.node,
          selectable: !this.creatingEdge.active
        }
      };
      
      return configs;
    },

    eventHandlers() {
      return {
        "view:click": this.handleViewClick,
        "node:contextmenu": this.handleNodeContextMenu,
        "edge:contextmenu": this.handleEdgeContextMenu,
        "view:contextmenu": this.handleViewContextMenu,
        "node:click": this.handleNodeClick,
        "view:mode": this.handleViewMode,
        "node:dblclick": ({ node }) => this.handleNodeDblclick(node),
      };
    },
    
    
    isBuildingLevel() {
      return this.currentBuilding !== null;
    },
    
    buildingFloors() {
      if (!this.currentBuilding) return [];
      return Object.entries(this.graphData.levels[this.currentBuilding].floors || {});
    },
    
    currentLevelName() {
        if (this.currentFloor) {
          const building = this.graphData.levels[this.currentBuilding];
          const floor = building.floors[this.currentFloor];
          return `${building.name} - ${floor.name}`;
        }
        if (this.currentBuilding) {
          return this.graphData.levels[this.currentBuilding].name;
        }
        if (this.currentLevel === 'main') {
          return 'Главная карта';
        }
        
        // Получаем название уровня из данных
        const levelData = this.graphData?.levels[this.currentLevel];
        if (levelData) {
          // Для обратной совместимости: если нет явного имени, используем имя первого узла
          return levelData.name || levelData.nodes[Object.keys(levelData.nodes)[0]]?.name || 'Карта';
        }
        
        return 'Карта Камчатского края';
    },
    
    currentNodes() {
      return this.graphData?.levels[this.currentLevel]?.nodes || {};
    },
    
    currentLayouts() {
      return this.graphData?.layouts[this.currentLevel] || {};
    },
    
    backgroundImage() {
      if (this.currentBuilding || this.currentFloor) return '';
      if (!this.graphData) return '';
      return this.graphData.levels[this.currentLevel]?.background || '';
    }
  },
  
  watch: {
    // Вотчеры
    currentNodes: {
      handler(newNodes) {
        this.nodes = newNodes;
      },
      immediate: true
    },
    
    currentLayouts: {
      handler(newLayouts) {
        this.layouts.nodes = newLayouts;
      },
      immediate: true
    },
    
    // Обновляем конфигурацию при изменении узлов или рёбер
    nodes: {
      handler() {
        // Vue автоматически обновит компонент при изменении реактивных данных
      },
      deep: true
    },
    
    edges: {
      handler() {
        // Vue автоматически обновит компонент при изменении реактивных данных
      },
      deep: true
    }
  }
};

// ====== ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ ======

// FontAwesome mapping: класс -> { unicode, fontFamily }
const fontAwesomeMap = {
  'fa-solid fa-address-card': { unicode: 'F2BB', unicodeHtml: '&#xf2bb;', fontFamily: 'Font Awesome 6 Free', fontWeight: '900' },
  'fa-regular fa-hard-drive': { unicode: 'F0A0', unicodeHtml: '&#xf0a0;', fontFamily: 'Font Awesome 6 Free', fontWeight: '400' },
  'fa-regular fa-folder-closed': { unicode: 'E185', unicodeHtml: '&#xe185;', fontFamily: 'Font Awesome 6 Free', fontWeight: '400' },
  'fa-brands fa-pied-piper-hat': { unicode: 'F4E5', unicodeHtml: '&#xf4e5;', fontFamily: 'Font Awesome 6 Brands', fontWeight: '400' },
  'fa-solid fa-wifi': { unicode: 'F1EB', unicodeHtml: '&#xf1eb;', fontFamily: 'Font Awesome 6 Free', fontWeight: '400' },
  'fa-solid fa-key': { unicode: 'F084', unicodeHtml: '&#xf084;', fontFamily: 'Font Awesome 6 Free', fontWeight: '400' },
  'fa-solid fa-print': { unicode: 'F02F', unicodeHtml: '&#xf02f;', fontFamily: 'Font Awesome 6 Free', fontWeight: '400' },
  'fa-solid fa-database': { unicode: 'F1C0', unicodeHtml: '&#xf1c0;', fontFamily: 'Font Awesome 6 Free', fontWeight: '400' },
  'fa-solid fa-desktop': { unicode: 'F390', unicodeHtml: '&#xf390;', fontFamily: 'Font Awesome 6 Free', fontWeight: '400' },
};
window.fontAwesomeMap = fontAwesomeMap;

// Компонент-обертка для визуализации графа с поддержкой кастомных узлов, иконок и фона
const VNetworkGraphContainer = {
  name: 'VNetworkGraphContainer',
  // Компонент-обертка для визуализации графа с поддержкой кастомных узлов, иконок и фона
  props: {
    loading: Boolean, // Флаг загрузки
    selectedNodes: Array, // Выделенные узлы
    selectedEdges: Array, // Выделенные связи
    nodes: Object, // Объект всех узлов
    edges: Object, // Объект всех связей
    layouts: Object, // Расположение узлов
    layers: Object, // Слои (например, фон)
    backgroundImage: String, // Фоновое изображение
    configsComputed: Object, // Конфиг для графа
    eventHandlers: Object, // Обработчики событий
    configUpdateKey: [String, Number] // Ключ для форс-обновления
  },
  emits: ['update:selectedNodes', 'update:selectedEdges'],
  data() {
    return {
      fontAwesomeMap: window.fontAwesomeMap // Карта FontAwesome для иконок
    };
  },
  methods: {
    // Лог для отладки отображения иконки узла
    logNodeIcon(nodeId) {
      const node = this.nodes[nodeId];
      const fa = this.fontAwesomeMap[node && node.icon];
      console.log('[override-node] nodeId:', nodeId, 'icon:', node && node.icon, 'fa:', fa);
    },
    // Получить семейство шрифта по unicode
    getFontFamily(unicode) {
      for (const key in this.fontAwesomeMap) {
        if (this.fontAwesomeMap[key].unicode === unicode) {
          return this.fontAwesomeMap[key].fontFamily;
        }
      }
      return 'Font Awesome 6 Free';
    },
    // Получить font-weight по unicodeHtml
    getFontAwesomeFontWeight(unicodeHtml) {
      for (const key in this.fontAwesomeMap) {
        if (this.fontAwesomeMap[key].unicodeHtml === unicodeHtml) {
          return this.fontAwesomeMap[key].fontFamily === 'Font Awesome 6 Free' ? '900' : '400';
        }
      }
      return '900';
    },
    // Получить семейство шрифта по классу иконки
    getFontFamilyByIconEntity(icon) {
      if (icon === 'fa-brands fa-pied-piper-hat') return 'Font Awesome 6 Brands';
      return 'Font Awesome 6 Free';
    },
    // Проксировать fitToContents наружу
    fitToContents() {
      if (this.$refs.graph && typeof this.$refs.graph.fitToContents === 'function') {
        return this.$refs.graph.fitToContents();
      }
    },
    // Проксировать startBoxSelection наружу
    startBoxSelection() {
      if (this.$refs.graph && typeof this.$refs.graph.startBoxSelection === 'function') {
        return this.$refs.graph.startBoxSelection();
      }
    },
    // Проксировать translateFromDomToSvgCoordinates наружу
    translateFromDomToSvgCoordinates(point) {
      if (this.$refs.graph && typeof this.$refs.graph.translateFromDomToSvgCoordinates === 'function') {
        return this.$refs.graph.translateFromDomToSvgCoordinates(point);
      }
      return point;
    }
  },
  template: `
    <v-network-graph
      v-show="!loading"
      :selected-nodes="selectedNodes"
      :selected-edges="selectedEdges"
      @update:selected-nodes="$emit('update:selectedNodes', $event)"
      @update:selected-edges="$emit('update:selectedEdges', $event)"
      :nodes="nodes"
      :edges="edges"
      :layouts="layouts"
      :layers="layers"
      :background-image="backgroundImage"
      :configs="configsComputed"
      style="height:100vh"
      ref="graph"
      :event-handlers="eventHandlers"
      :key="configUpdateKey"
    >
      <defs>
        <component is="style">
          @font-face {
            font-family: 'Font Awesome 6 Free';
            font-style: normal;
            font-weight: 900;
            src: url('/fonts/fontawesome-free-6.7.2-web/webfonts/fa-solid-900.woff2') format('woff2');
          }
          @font-face {
            font-family: 'Font Awesome 6 Brands';
            font-style: normal;
            font-weight: 400;
            src: url('/fonts/fontawesome-free-6.7.2-web/webfonts/fa-brands-400.woff2') format('woff2');
          }
          @font-face {
            font-family: 'Font Awesome 6 Free';
            font-style: normal;
            font-weight: 400;
            src: url('/fonts/fontawesome-free-6.7.2-web/webfonts/fa-regular-400.woff2') format('woff2');
          }
        </component>
      </defs>
      <!-- Фоновое изображение -->
      <template #background>
        <image
          :href="backgroundImage"
          x="0"
          y="0"
          width="1000"
          height="600"
          preserveAspectRatio="xMidYMid meet"
        />
      </template>
      <!-- Кастомная отрисовка метки связи -->
      <template #edge-label="{ edge, ...slotProps }">
        <v-edge-label 
          :text="edge.label || ''" 
          :color="edge.color || '#ff0000'" 
          align="center" 
          vertical-align="above" 
          v-bind="slotProps" 
        />
      </template>
      <!-- Кастомная отрисовка узла (с иконкой, цветом, формой) -->
      <template #override-node="{ nodeId, scale, config, ...slotProps }">
        <g>
          <rect 
            v-if="nodes[nodeId] && nodes[nodeId].shape === 'rect'"
            :x="-(nodes[nodeId].size || 16) * scale" 
            :y="-(nodes[nodeId].size || 16) * scale" 
            :width="(nodes[nodeId].size || 16) * 2 * scale" 
            :height="(nodes[nodeId].size || 16) * 2 * scale" 
            :rx="(nodes[nodeId].borderRadius || 4) * scale" 
            :fill="nodes[nodeId].color || '#4466cc'" 
            :stroke="nodes[nodeId].strokeColor || '#000000'"
            :stroke-width="nodes[nodeId].strokeWidth ? nodes[nodeId].strokeWidth * scale : 0"
            :stroke-dasharray="nodes[nodeId].strokeDasharray || '0'"
            v-bind="slotProps"
          />
          <circle 
            v-else-if="nodes[nodeId]"
            :r="(nodes[nodeId].size || 16) * scale" 
            :fill="nodes[nodeId].color || '#4466cc'" 
            :stroke="nodes[nodeId].strokeColor || '#000000'"
            :stroke-width="nodes[nodeId].strokeWidth ? nodes[nodeId].strokeWidth * scale : 0"
            :stroke-dasharray="nodes[nodeId].strokeDasharray || '0'"
            v-bind="slotProps" 
          />
          <foreignObject 
            v-if="nodes[nodeId] && !nodes[nodeId].hideIcon && nodes[nodeId].icon"
            :width="(nodes[nodeId].size || 16) * 2 * scale"
            :height="(nodes[nodeId].size || 16) * 2 * scale"
            :x="-(nodes[nodeId].size || 16) * scale"
            :y="-(nodes[nodeId].size || 16) * scale"
          >
            <div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
              <i :class="nodes[nodeId].icon" style="font-size:calc(1.2em * scale);"></i>
            </div>
          </foreignObject>
        </g>
      </template>
    </v-network-graph>
  `
};

// Панель навигации по уровням и этажам
const NavigationBar = {
  name: 'NavigationBar',
  props: {
    levelHistory: Array, // История переходов по уровням
    buildingHistory: Array, // История переходов по зданиям
    currentFloor: [String, Number, null], // Текущий этаж
    goBack: Function, // Функция возврата
    currentLevelName: String, // Название текущего уровня
    currentBuilding: [String, Number, null], // Текущее здание
    buildingFloors: Array, // Список этажей
    goToFloor: Function, // Перейти на этаж
    currentFloorActive: [String, Number, null] // Активный этаж
  },
  template: `
    <div class="navigation-bar">
      <button 
        v-if="levelHistory.length > 0 || buildingHistory.length > 0 || currentFloor" 
        @click="goBack" 
        class="nav-button back-button"
      >
        ← Назад
      </button>
      <div class="level-indicator">
        {{ currentLevelName }}
      </div>
      <div v-if="currentBuilding" class="floor-buttons">
        <button
          v-for="([floorId, floor]) in buildingFloors"
          :key="floorId"
          @click="goToFloor(floorId)"
          :class="{ active: currentFloorActive === floorId }"
          class="nav-button floor-button"
        >
          {{ floor.name }}
        </button>
      </div>
    </div>
  `
};

// Индикатор режима прямоугольного выделения
const BoxSelectionIndicator = {
  name: 'BoxSelectionIndicator',
  template: `
    <div class="box-selection-mode-indicator">
      Режим выделения (Ctrl + перетаскивание)
    </div>
  `
};

// Глобальная регистрация компонентов для доступа из main.js
if (typeof window !== 'undefined') {
  window.GraphCore = GraphCore;
  window.VNetworkGraphContainer = VNetworkGraphContainer;
  window.NavigationBar = NavigationBar;
  window.BoxSelectionIndicator = BoxSelectionIndicator;
}