class TodoManager {
  constructor() {
    this.templates = {};
    this.modal = null;
    this.currentPage = '';
    this.allData = {
      todos: [],
      current_section: {},
      done: [],
      todos_by_date: {},
      done_todos_by_date: {},
      selected: [],
    }
    this.init(); 
  }

  async init() {
    try {
      const todos = await this.updateTodosList();
      this.registerTemplates();
      this.groupTodos(todos);
      this.sortTodos();
      this.navToAllTodos();
    } catch (error) {
      console.error('Failed to update todos');
    }
  }

  registerTemplates() {
    document.querySelectorAll("script[type='text/x-handlebars']").forEach(tmpl => {
      this.templates[tmpl.id] = Handlebars.compile(tmpl.innerHTML);
    });
    document.querySelectorAll("[data-type=partial]").forEach(tmpl => {
      Handlebars.registerPartial(tmpl.id, tmpl.innerHTML);
    });
  }

  bindEventListeners() {
    document.getElementById('sidebar').addEventListener('click', event => this.navToSubGroup(event));
    document.querySelector('label[for="new_item"]').addEventListener('click', () => this.modal.open());
    document.getElementById('modal_layer').addEventListener('click', () => this.modal.close());
    document.addEventListener('keyup', event => {
      if (event.key === 'Escape') {
        this.modal.close();
      }
    });
  }

  bindEventListenersTodoItems() {
    document.querySelector('tbody').addEventListener('click', event => {
      event.preventDefault();
      const target = event.target;

      if (target.tagName === 'LABEL') {
        const trElement = event.target.closest('tr');
        const dataId = Number(trElement.getAttribute('data-id'));
        let todo = this.allData.todos.filter(todo => todo.id === dataId)[0];
        this.modal.open(todo);
        return;
      }

      if (target.closest('td.delete')) {
        this.deleteTodo(event);
        return;
      }

      if (target.tagName === 'SPAN' || target.closest('td.list_item')) {
        if (target.closest('td.list_item')) {
          this.toggleTodoComplete(event);
          return;
        }
      }
    });
  }

  setupModal() {
    const modalElement = document.getElementById('form_modal');
    const modalLayer = document.getElementById('modal_layer');

    if (modalElement && modalLayer) {
      this.modal = new Modal(modalElement);
      this.bindModalEvents();
    } else {
      console.error('Modal elements not found in the DOM.');
    }
  }

  bindModalEvents() {
    if (this.modal && this.modal.form) {
      this.modal.form.addEventListener('submit', event => {
        event.preventDefault();
        const todoId = Number(this.modal.form.getAttribute('data-todo-id'));
        const formData = this.modal.getFormData();
        if (todoId) {
          this.updateTodo(formData, todoId);
        } else {
          this.createTodo(formData);
        }
      });

      this.modal.form.querySelector('button').addEventListener('click', event => this.markTodoComplete(event));
    }
  }

  async sendUpdate(todo) {
    let {id, due_date, ...tempTodo} = todo; 

    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tempTodo),
      });
    } catch (error) {
      console.error('Error updating todo', error);
    }
  }

  async toggleTodoComplete(event) {
    const clickedElement = event.target;
    const dataTitle = document.querySelector('header dl dt time').textContent;

    if (clickedElement.tagName === 'TD' || clickedElement.tagName === 'SPAN') {
      const trElement = clickedElement.closest('tr');
      const dataId = Number(trElement.getAttribute('data-id'));
      if (dataId) {
        const todo = this.allData.todos.find(todo => todo.id === dataId);
        let {...tempTodo} = todo; 
        tempTodo.completed = todo.completed !== true ? true : false;
        todo.completed = tempTodo.completed ? false : true;
        try {
          await this.sendUpdate(tempTodo);
          const todos = await this.updateTodosList();
          this.modal.close();
          this.groupTodos(todos);
          this.sortTodos();
          this.updateCurrentView(dataTitle, this.currentPage);
          this.renderPage();
          } catch (error) {
            console.error('Error updating page after updating todo:', error);
        }
      }
    }
  }

  async markTodoComplete(event) {
    event.preventDefault();
    let dataId;
    let clickedElement = event.target;
    const dataTitle = document.querySelector('header dl dt time').textContent;

    if (clickedElement.tagName === 'BUTTON') {
      const form = clickedElement.closest('form');
      dataId = Number(form.getAttribute('data-todo-id'));
      if (dataId) {
        const todo = this.allData.todos.find(todo => todo.id === dataId);
        if (todo) {
          todo.completed = true;
          try {
            await this.sendUpdate(todo);
            const todos = await this.updateTodosList();
            this.modal.close();
            this.groupTodos(todos);
            this.sortTodos();
            this.updateCurrentView(dataTitle, this.currentPage);
            this.renderPage();
            } catch (error) {
              console.error('Error updating page after updating todo:', error);
          }
        }
      } else {
        alert('Cannot mark as complete as item has not been created yet!');
      }
    }
  }

  isValidTitleLength(input) {
    const title = input.trim();
    return (title.length >= 3 && title.length <= 100)
  }

  async createTodo(formData) {
    if (!this.isValidTitleLength(formData.title)) {
      alert('You must enter a title between 3 and 100 characters long.');
      return;
    }

    try {
      const response = await fetch("/api/todos", {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(formData),
      });
      try {
        const todos = await this.updateTodosList();
        this.groupTodos(todos);
        this.sortTodos();
        this.navToAllTodos();
      } catch (error) {
        console.error('Error updating page after creating todo:', error);
      }
    } catch (error) {
      console.error('Error creating todo:', error);
    }
  }

  async deleteTodo(event) {
    let deleteButton = event.target.closest('td.delete');

    if (deleteButton) {
      const dataTitle = document.querySelector('header dt time').textContent;
      const todoElement = deleteButton.closest('tr');
      const todoId = todoElement.getAttribute('data-id');
  
      try {
        const response = await fetch(`/api/todos/${todoId}`, {
          method: 'DELETE',
        });

        if (response.status === 204) {
          todoElement.remove();
          try {
            const todos = await this.updateTodosList();
            this.allData.todos = todos;
            this.groupTodos(todos);
            this.sortTodos();
            this.updateCurrentView(dataTitle, this.currentPage);
            this.renderPage();
          } catch (error) {
            console.error('Error updating page:', error);
          }
        }
      } catch (error) {
        console.error('Error deleting todo:', error)
      }
    }
  }

  async updateTodo(formData, todoId) {
    const todo = this.allData.todos.find(todo => todo.id === todoId);
    const dataTitle = todo.due_date;

    if (!this.isValidTitleLength(formData.title)) {
      alert('You must enter a title at least 3 characters long.');
      return;
    }

    formData['completed'] = todo.completed;

    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(formData),
      });
      try {
        const todos = await this.updateTodosList();
        this.modal.close();
        this.groupTodos(todos);
        this.sortTodos();
        this.updateCurrentView(dataTitle, this.currentPage);
        this.renderPage();
      } catch (error) {
        console.error('Error updating page after updating todo:', error);
      }
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  }

  async fetchAllTodos() {
    const response = await fetch("/api/todos");
    if (!response.ok) {
      throw new Error(`Failed to fetch todos. Status: ${response.status}`);
    }

    return response.json();
  }

  setDueDates(todos) {
    return todos.map(todo => {
      if (!todo.month || !todo.year) {
        todo['due_date'] = 'No Due Date';
        return todo;
      } else if (todo.month && todo.year) {
        todo['due_date'] = `${todo.month}/${todo.year.substring(2)}`;
        return todo;
      }
    });
  }

  groupByDate(todos) {
    this.allData.todos_by_date = {};
    this.allData.todos = todos;
    let dueDate;

    todos.forEach(todo => {
      dueDate = todo.due_date;
      if (this.allData.todos_by_date[dueDate]) {
        this.allData.todos_by_date[dueDate].push(todo.due_date);
      } else {
        this.allData.todos_by_date[dueDate] = [todo.due_date];
      }
    });
  }

  selectCompletedTodos() {
    return this.allData.todos.filter(todo => todo.completed);
  }

  groupByDone() {
    this.allData.done_todos_by_date = {};
    this.allData.done = [];
    let completedTodos = this.selectCompletedTodos();
    let dueDate;

    completedTodos.forEach(todo => {
      dueDate = todo.due_date;
      this.allData.done.push(todo.id);

      if (this.allData.done_todos_by_date[dueDate]) {
        this.allData.done_todos_by_date[dueDate].push(todo.id);
      } else {
        this.allData.done_todos_by_date[dueDate] = [todo.id];
      }
    });
  }

  groupTodos(todos) {
    this.groupByDate(todos);
    this.groupByDone(todos);
  }

  sortTodos() {
    this.allData.todos_by_date = this.sortByDateAscend(this.allData.todos_by_date);
    this.allData.done_todos_by_date = this.sortByDateAscend(this.allData.done_todos_by_date);
  }

  sortByDateAscend(todos) {
    const sortedObj = Object.keys(todos)
      .sort((a, b) => {
        if (a === "No Due Date" && b !== "No Due Date") {
          return -1;
        }
        if (b === "No Due Date" && a !== "No Due Date") {
            return 1;
        }
        if (a === "No Due Date" && b === "No Due Date") {
            return 0;
        }
  
        const [aMonth, aYear] = a.split('/').map(Number);
        const [bMonth, bYear] = b.split('/').map(Number);
        return aYear - bYear || aMonth - bMonth;
        })
      .reduce((acc, key) => {
        acc[key] = todos[key];
        return acc;
      }, {});
    
    return sortedObj;
  }

  sortSelectedTodos(todos) {
    todos.sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed - b.completed;
      }
  
      return a.id - b.id;
    });
  }

  async updateTodosList() {
    try {
      let fetchedTodos = await this.fetchAllTodos();
      return this.setDueDates(fetchedTodos);
    } catch (error) {
      console.error('Error updating all todos:', error);
    }
  }

  navToAllTodos() {
    this.currentPage = 'allTodos';
    this.allData.selected = this.allData.todos;
    this.sortSelectedTodos(this.allData.selected);
    this.allData.current_section['title'] = 'All Todos';
    this.allData.current_section['data'] = this.allData.selected.length;
    this.renderPage();
  }

  navToCompletedTodos() {
    this.currentPage = 'completedTodos';
    let completedTodos = this.selectCompletedTodos();
    this.allData.done = completedTodos;
    this.allData.selected = completedTodos;
    this.sortSelectedTodos(this.allData.selected);
    this.allData.current_section['title'] = 'Completed';
    this.allData.current_section['data'] = this.allData.selected.length;
    this.renderPage();
  }

  navToSubGroup(event) {
    let dlClicked = event.target.closest('dl');

    if (dlClicked) {
      if (dlClicked.closest('#all_header')) {
        this.navToAllTodos();
      }

      if (dlClicked.closest('#all_done_header')) {
        this.navToCompletedTodos();
      }

      if (dlClicked.closest('article#all_lists')) {
        this.currentPage = 'allTodosSub';
        const dataTitle = dlClicked.getAttribute('data-title');
        const todo = this.allData.todos.filter(todo => todo.due_date === dataTitle)[0];
        this.updateCurrentView(dataTitle, this.currentPage);
        this.renderPage();
      }

      if (dlClicked.closest('article#completed_lists')) {
        this.currentPage = 'completedTodosSub';
        const dataTitle = dlClicked.getAttribute('data-title');
        const todo = this.allData.todos.filter(todo => todo.due_date === dataTitle && todo.completed)[0];
        this.updateCurrentView(dataTitle, this.currentPage);
        this.renderPage();
      }
    }
  }

  renderPage() {
    const mainPage = document.querySelector('body');
    mainPage.innerHTML = this.templates.main_template(this.allData);
    this.bindEventListeners();
    this.setupModal();

    if (this.allData.todos.length >= 1) {
      this.bindEventListenersTodoItems();
    }
  }

  updateCurrentView(title, view) {
    if (view === 'allTodos') {
      this.navToAllTodos();
      return;
    }

    if (view === 'completedTodos') {
      this.navToCompletedTodos();
      return;
    }

    if (view === 'allTodosSub') {
      this.allData.selected = this.allData.todos.filter(todo => todo.due_date === title);
      this.sortSelectedTodos(this.allData.selected);
      this.allData.current_section['title'] = title;
      this.allData.current_section['data'] = this.allData.selected.length;
      return;
    }

    if (view === 'completedTodosSub') {
      this.allData.selected = this.allData.todos.filter(todo => todo.due_date === title && todo.completed);
      this.sortSelectedTodos(this.allData.selected);
      this.allData.current_section['title'] = title;
      this.allData.current_section['data'] = this.allData.selected.length;
      return;
    }
  }
}

class Modal {
  constructor(modalElement) {
    this.modalElement = modalElement;
    this.modalLayer = document.getElementById('modal_layer');
    this.form = modalElement.querySelector('form');
  }

  open(todo = null) {
    this.modalLayer.style.display = 'block';
    this.modalElement.style.display = 'block';

    this.form.reset();
    if (todo) {
      this.form.querySelector("#title").value = todo.title;
      this.form.querySelector("#due_day").value = todo.day;
      this.form.querySelector("#due_month").value = todo.month;
      this.form.querySelector("#due_year").value = todo.year;
      this.form.querySelector("textarea[name='description']").value = todo.description;
      this.form.dataset.todoId = todo.id;
    } else {
      delete this.form.dataset.todoId;
    }
  }

  close() {
    this.modalLayer.style.display = 'none';
    this.modalElement.style.display = 'none';
  }

  getFormData() {
    const formData = new FormData(this.form);
    return {
      title: formData.get("title"),
      day: (formData.get("due_day") !== 'Day' && formData.get("due_day") !== null) ? formData.get("due_day") : "",
      month: (formData.get("due_month") !== 'Month' && formData.get("due_month") !== null) ? formData.get("due_month") : "",
      year: (formData.get("due_year") !== 'Year' && formData.get("due_year") !== null) ? formData.get("due_year") : "",
      description: formData.get("description"),
    };
  }

  bindFormSubmit(callback) {
    this.form.addEventListener('submit', event => {
      event.preventDefault();
      callback();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const todoManager = new TodoManager();
});
