var Calendar = (function () {

    var Calendar = function (container, options) {
        var that = this;

        that._options   = that._getOptions(options);

        that.initialDate = new Date();
        that.initialDate.setDate(1);
        that.initialDate.setHours(0, 0, 0, 0);

        that.listHeight = (this._options.weeksToDisplay - 1) * this._options.weekRowHeight;

        // init HTML-nodes
        that._containerEl       = container;
        that._headerEl          = that._createHeaderEl();
        that._scrollerEl        = that._createScrollerEl();
        that._calendarEl        = that._createCalendarEl();
        that._yearEl            = that._createYearEl();

        that._transformProperty = that._getTransformProperty();
        that._lastY             = that.listHeight;
        that._scrollHeight      = that.listHeight * 3;
        that._weeksData         = [];

        that._currentIndex      = 0;
        that._loadedBefore      = 0;
        that._preloadTimer      = null;
        that._fixYearScroll     = null;
        that._fixDateScroll     = null;
        that._minDate           = null;
        that._maxDate           = null;
        that._year              = null;
        that._dateDiff          = null;
        that._startDate         = null;
        that._finishDate        = null;
        that._expandStarted     = null;
        that._dragStarted       = null;
        that._expandFinishDate  = null;

        that._init();
    };

    Calendar.prototype = {

        _defaultOptions: {
            weeksToDisplay: 10,
            weekRowHeight: 37,
            firstWeekDay: 0,
            daysOff: [0, 6],
            dayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            monthNames:['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        },

        ONE_DAY: 24 * 60 * 60 * 1000,


        /* Dates setters */

        resetDates: function () {
            var that = this;

            that._startDate     = null;
            that._finishDate    = null;

            that._updateCalendarHtml();
        },

        setInitialDate: function (initialDate) {
            var that            = this,
                firstWeekDay    = that._options.firstWeekDay,
                date            = initialDate.getDate(),
                weekDay         = initialDate.getDay(),
                initialTime     = initialDate.getTime(),
                weeksCount      = that._options.weeksToDisplay,
                weeksData       = [],
                i               = 0,
                j,
                counter,
                weekDays;

            that.initialDate = new Date(initialTime);
            that.initialDate.setHours(0, 0, 0, 0);

            weekDay = ((7 - firstWeekDay + weekDay) % 7) + firstWeekDay;
            for (; i <= weeksCount; ++i) {

                counter = i * 7 - Math.abs(weekDay - firstWeekDay);
                weekDays = [];

                for (j = firstWeekDay, c = j + 7; j < c; j++) {
                    counter++;
                    date = new Date(initialTime);
                    date.setDate(date.getDate() + counter - 1);
                    date.setHours(0, 0, 0, 0);

                    weekDays.push(date);
                }

                weeksData.push(weekDays);
            }

            that._weeksData = weeksData;
            that._minDate   = new Date(weeksData[0][0].getTime() - (that.ONE_DAY * 10 * 7));
            that._maxDate   = new Date(weeksData[weeksData.length - 1][6].getTime() + (that.ONE_DAY * 9 * 7));

            that.setYear(weeksData[0][0].getFullYear());
        },

        setFinishDate: function (d, updateStart) {
            var date = new Date(d);
            date.setHours(0, 0, 0, 0);

            var that        = this,
                startDate   = that._startDate,
                finishDate  = that._finishDate,
                calendar    = that._calendarEl,
                startDateEl = calendar.querySelector('.week .day.start'),
                prevDateEl  = calendar.querySelector('.week .day.finish'),
                newDateEl   = calendar.querySelector('.week .day[data-date="' + date.getTime() + '"]'),
                newStartDate, 
                leftArr, 
                rightArr;

            if (prevDateEl) {
                prevDateEl.classList.remove('finish');

                // if before start and finish dates are different - remove arrows
                if (prevDateEl != startDateEl) {
                    leftArr = prevDateEl.querySelector('.expand-left');
                    rightArr = prevDateEl.querySelector('.expand-right');

                    leftArr && leftArr.parentNode.removeChild(leftArr);
                    rightArr && rightArr.parentNode.removeChild(rightArr);
                }
            }

            // need to update start date arrows
            if (startDateEl) {
                rightArr = startDateEl.querySelector('.expand-right');

                if (startDate.getTime() + that.ONE_DAY >= date.getTime()) {
                    rightArr && rightArr.parentNode.removeChild(rightArr);
                } else {
                    !rightArr && that._appendArrow('right', startDateEl);
                }
            }

            if (newDateEl) {
                newDateEl.classList.add('finish');

                if (!startDate || startDate.getTime() + that.ONE_DAY < date.getTime()) {
                    that._appendArrow('left', newDateEl);
                }

                that._appendArrow('right', newDateEl);
            }

            if (!startDate || startDate.getTime() === finishDate.getTime()) {
                newStartDate = date.getTime()
            } else if (startDate) {
                newStartDate = startDate.getTime() + date.getTime() - finishDate.getTime();
            }

            that._finishDate = date;

            if (updateStart || !startDate) {
                that.setStartDate(new Date(newStartDate));
            } else {
                that._selectDates();
            }
        },

        setStartDate: function (d) {
            var date = new Date(d);
            date.setHours(0, 0, 0, 0);

            var that            = this,
                finishDate      = that._finishDate,
                startDate       = that._startDate,
                calendar        = that._calendarEl,
                finishDateEl    = calendar.querySelector('.week .day.finish'),
                prevDateEl      = calendar.querySelector('.week .day.start'),
                newDateEl       = calendar.querySelector('.week .day[data-date="' + date.getTime() + '"]'),
                leftArr, 
                rightArr;

            if (prevDateEl) {
                prevDateEl.classList.remove('start');

                // if before start and finish dates are different - remove arrows
                if (startDate.getTime() !== finishDate.getTime()) {
                    leftArr = prevDateEl.querySelector('.expand-left');
                    rightArr = prevDateEl.querySelector('.expand-right');

                    leftArr && leftArr.parentNode.removeChild(leftArr);
                    rightArr && rightArr.parentNode.removeChild(rightArr);
                }
            }

            // need to update finish date arrows
            if (finishDateEl) {
                leftArr = finishDateEl.querySelector('.expand-left');
                if (finishDate.getTime() - date.getTime() <= that.ONE_DAY) {
                    leftArr && leftArr.parentNode.removeChild(leftArr);
                } else {
                    !leftArr && that._appendArrow('left', finishDateEl);
                }
            }

            if (newDateEl) {
                newDateEl.classList.add('start');

                that._appendArrow('left', newDateEl);
                if (!finishDate || (finishDate.getTime() != date.getTime() && finishDate.getTime() - date.getTime() > that.ONE_DAY)) {
                    that._appendArrow('right', newDateEl);
                }
            }

            that._startDate = date;

            if (!finishDate) {
                that.setFinishDate(new Date(date.getTime()), false);
            }

            that._selectDates();
        },

        setDates: function (startDate, finishDate, scrollToDate) {
            var that = this;

            that._finishDate = new Date(finishDate.getTime());
            that._finishDate.setHours(0, 0, 0, 0);

            that._startDate = new Date(startDate.getTime());
            that._startDate.setHours(0, 0, 0, 0);

            that._updateCalendarHtml();

            scrollToDate && that.scrollToDate(that._finishDate);
        },

        setYear: function (year) {
            var that    = this;

            that._year = year;
            that._yearEl.innerHTML = year;
        },


        /* Date getters */

        getStartDate: function () {
            return this._startDate;
        },

        getFinishDate: function () {
            return this._finishDate;
        },


        /* Scroll methods */

        scrollToDate: function (d, force) {
            var that        = this,
                date        = new Date(d),
                initialDate = that.initialDate,

                weeksData   = that._weeksData,
                firstDate   = weeksData[0][0],
                lastDate    = weeksData[weeksData.length - 2][6],
                minDate     = that._minDate,
                maxDate     = that._maxDate,

                listHeight  = that.listHeight,
                weekHeight  = that._options.weekRowHeight,

                initialY    = listHeight * that._loadedBefore,
                y           = initialY,

                daysDiff    = Math.floor(Math.abs(initialDate - date) / that.ONE_DAY),
                weeksCount  = Math.floor(daysDiff / 7),
                chunksCount;

            if (date.getTime()) {
                date.setHours(0, 0, 0, 0);

                // do not scroll if date already visible and no need force scroll
                if (date >= firstDate && date <= lastDate && !force) {
                    return;
                }

                // need to "preload" dates after
                if (date > maxDate) {
                    that._maxDate   = new Date(maxDate.getTime() + that.ONE_DAY * weeksCount * 7);
                    chunksCount     = Math.floor(weeksCount / 9);
                    that._setScrollHeight(that._scrollHeight + listHeight * chunksCount);
                }
                // need to "preload" dates before
                else if (date < minDate) {
                    that._minDate   = new Date(minDate.getTime() + that.ONE_DAY * (weeksCount - 1) * 7);
                    chunksCount     = Math.floor(weeksCount / 10);

                    that._loadedBefore += chunksCount;
                    initialY = listHeight * that._loadedBefore;

                    that._setScrollHeight(that._scrollHeight + listHeight * chunksCount);
                }

                if (date < initialDate) {
                    y = initialY - Math.ceil(daysDiff / 7) * weekHeight - weekHeight;
                } else if (date > initialDate) {
                    y = initialY + Math.floor(daysDiff / 7) * weekHeight;
                }

                if (y < 0) {
                    y = 0;
                } else if (y > that._scrollHeight - listHeight) {
                    y = that._scrollHeight - listHeight;
                }

                that._scrollTo(y);
            }
        },

        scrollToYear: function (year) {
            var that        = this,
                startDate   = that._startDate,
                today       = new Date(),
                dateToScroll;

            if (startDate && year == startDate.getFullYear()) {
                dateToScroll = startDate;
                that._fixDateScroll = dateToScroll;
            } else if (year == today.getFullYear()) {
                dateToScroll = today;
                that._fixDateScroll = dateToScroll;
            } else {
                dateToScroll = new Date(year, 0, 1);
                that._fixYearScroll = true;
            }

            that.scrollToDate(dateToScroll, true);
        },


        /* Initialization methods */

        _init: function () {
            var that        = this,
                container   = that._containerEl,
                wrapper     = document.createElement('div'),
                y;

            wrapper.className = 'wrapper';
            wrapper.appendChild(that._scrollerEl);
            wrapper.appendChild(that._calendarEl);

            container.className = 'calendar';
            container.appendChild(that._headerEl);
            container.appendChild(wrapper);
            container.appendChild(that._yearEl);

            that.setInitialDate(that.initialDate);
            that._initCalendarHtml();

            y = that.listHeight - that._options.weekRowHeight;
            that._scrollTo(y);

            that._initEvents();
        },

        _initEvents: function () {
            var that = this,
                calendar = this._calendarEl,
                scroller = that._scrollerEl;

            calendar.addEventListener('click', that._onClick.bind(that), false);
            calendar.addEventListener('mousedown', that._onMouseDown.bind(that), false);
            calendar.addEventListener('mouseup', that._onMouseUp.bind(that), false);
            calendar.addEventListener('mouseover', that._onMouseOver.bind(that), false);

            scroller.addEventListener('scroll', that._onScroll.bind(that), false);
        },


        /* Mouse events handlers */

        _onClick: function (e) {
            var that    = this,
                target  = e.target,
                cls     = target.className,
                parent  = target.parentNode;

            if (e.button !== 0) {
                return;
            }

            if (~cls.indexOf('expand-left')) {
                that._onExpandToLeftClick(parent);
            } else if (~cls.indexOf('expand-right')) {
                that._onExpandToRightClick(parent);
            }
        },

        _onMouseDown: function (e) {
            var that    = this,
                target  = ~e.target.className.indexOf('date') ? e.target.parentNode : e.target,
                cls     = target.className;

            if (e.button !== 0) {
                return;
            }

            if (~cls.indexOf('expand')) {
                that._onExpandStart(target);
            } else if (~cls.indexOf('selected')) {
                that._onDragStart(target);
            } else if (~cls.indexOf('day') && !~cls.indexOf('finish')) {
                that._onDayClick(target);
            }
        },

        _onMouseUp: function (e) {
            var that = this;

            that._expandStarted && that._onExpandEnd(e);
            that._dragStarted && that._onDragEnd(e);
        },

        _onMouseOver: function (e) {
            var that = this;

            if (that._expandStarted) {
                that._onExpand(e.target);
            } else if (that._dragStarted) {
                that._onDrag(e.target);
            }
        },

        _onDayClick: function (target) {
            var that = this,
                date = new Date(+target.getAttribute('data-date'));

            if (date != that._finishDate) {
                that.setFinishDate(date, true);
            }
        },


        /* Updating weeks data */

        _updateWeeks: function (weeksCount) {
            var that = this;

            (weeksCount < 0) ? that._unshiftWeeks(-weeksCount) : that._shiftWeeks(weeksCount);

            (!that._fixYearScroll && !that._fixDateScroll) && that._updateCalendarHtml();
        },

        _unshiftWeeks: function (weeksCount) {
            var that    = this,
                weeks   = that._weeksData,
                tmpDay  = new Date(weeks[0][0]),
                i       = 0,
                j, week;

            for (; i < weeksCount; ++i) {
                week = [];
                for (j = 0; j < 7; ++j) {
                    tmpDay.setDate(tmpDay.getDate() - 1);
                    week.unshift(tmpDay);
                    tmpDay = new Date(tmpDay.getTime());
                }
                weeks.pop();
                weeks.unshift(week);
            }
        },

        _shiftWeeks: function (weeksCount) {
            var that    = this,
                weeks   = that._weeksData,
                tmpDay  = new Date(weeks[weeks.length - 1][6]),
                i       = 0,
                j,
                week;

            for (; i < weeksCount; ++i) {
                week = [];
                for (j = 0; j < 7; ++j) {
                    tmpDay.setDate(tmpDay.getDate() + 1);
                    week.push(tmpDay);
                    tmpDay = new Date(tmpDay.getTime());
                }
                weeks.shift();
                weeks.push(week);
            }
        },


        /* Calendar data rendering and updating */

        _initCalendarHtml: function () {
            var that        = this,
                weeks       = that._weeksData,
                daysOff     = that._options.daysOff,
                finishDate  = that._finishDate ? that._finishDate.getTime() : 0,
                startDate   = that._startDate ? that._startDate.getTime() : 0,
                today       = new Date(),
                i           = 0,
                html        = '',
                arrowsHtml  = '',
                monthHtml   = '',
                week, 
                day, 
                dayTime, 
                cls, 
                j;

            today.setHours(0, 0, 0, 0);

            for (; week = weeks[i]; ++i) {
                html += '<div class="week">';

                for (j = 0; day = week[j]; ++j) {
                    arrowsHtml  = '';
                    monthHtml   = '';
                    dayTime     = day.getTime();
                    cls         = ['day'];

                    if (day < today) {
                        cls.push('date-before');
                    }

                    if (dayTime === today.getTime()) {
                        cls.push('today')
                    }

                    if (~daysOff.indexOf(day.getDay())) {
                        cls.push('day-off');
                    }

                    if (finishDate && startDate && dayTime >= startDate && dayTime <= finishDate) {
                        cls.push('selected');
                    }

                    if (startDate === dayTime) {
                        cls.push('start');

                        arrowsHtml = '<div class="expand-left"><div></div></div>';
                        if (finishDate - startDate > that.ONE_DAY) {
                            arrowsHtml += '<div class="expand-right"><div></div></div>';
                        }
                    }

                    if (finishDate === dayTime) {
                        cls.push('finish');

                        if (finishDate - startDate > that.ONE_DAY) {
                            arrowsHtml += '<div class="expand-left"><div></div></div>';
                        }
                        arrowsHtml += '<div class="expand-right"><div></div></div>';
                    }

                    if (day.getDate() === 1) {
                        monthHtml = '<div class="month"><div class="month-name">' + that._options.monthNames[day.getMonth()] + '</div></div>';
                        cls.push('has-month');
                    }

                    if (day.getMonth() & 1) {
                        cls.push('month-even');
                    }

                    html += '<div class="' + cls.join(' ') + '" data-date="' + day.getTime() + '">' +
                                arrowsHtml +
                                monthHtml +
                                '<div class="date">' + day.getDate() + '</div>' +
                            '</div>';
                }

                html += '</div>';
            }

            that._calendarEl.innerHTML = html;
        },

        _updateCalendarHtml: function () {
            var that        = this,
                datesEl     = that._calendarEl.querySelectorAll('.week .day'),
                weeks       = that._weeksData,
                daysOff     = that._options.daysOff,
                finishDate  = that._finishDate ? that._finishDate.getTime() : 0,
                startDate   = that._startDate ? that._startDate.getTime() : 0,
                today       = new Date(),
                i           = 0,
                counter     = 0,
                leftArr, 
                rightArr, 
                monthEl, 
                monthNameEl,
                week, 
                day, 
                dayTime, 
                dayEl, 
                cls, 
                j;

            today.setHours(0, 0, 0, 0);

            for (; week = weeks[i]; ++i) {
                for (j = 0; day = week[j]; ++j) {

                    dayTime     = day.getTime();
                    cls         = ['day'];

                    dayEl       = datesEl[counter];
                    leftArr     = dayEl.querySelector('.expand-left');
                    rightArr    = dayEl.querySelector('.expand-right');
                    monthEl     = dayEl.querySelector('.month');

                    leftArr && leftArr.parentNode.removeChild(leftArr);
                    rightArr && rightArr.parentNode.removeChild(rightArr);
                    monthEl && monthEl.parentNode.removeChild(monthEl);

                    dayEl.querySelector('.date').innerHTML = day.getDate();

                    if (day < today) {
                        cls.push('date-before');
                    }

                    if (dayTime === today.getTime()) {
                        cls.push('today')
                    }

                    if (~daysOff.indexOf(day.getDay())) {
                        cls.push('day-off');
                    }

                    if (startDate === dayTime) {
                        cls.push('start');
                        that._appendArrow('left', dayEl);
                        if (finishDate - startDate > that.ONE_DAY) {
                            that._appendArrow('right', dayEl);
                        }
                    }

                    if (finishDate === dayTime) {
                        cls.push('finish');
                        if (finishDate - startDate > that.ONE_DAY) {
                            that._appendArrow('left', dayEl);
                        }

                        that._appendArrow('right', dayEl);
                    }

                    if (finishDate && startDate && dayTime >= startDate && dayTime <= finishDate) {
                        cls.push('selected');
                    }

                    if (day.getDate() === 1) {
                        monthEl                 = document.createElement('div');
                        monthNameEl             = document.createElement('div');
                        monthEl.className       = 'month';
                        monthNameEl.className   = 'month-name';

                        monthNameEl.appendChild(document.createTextNode(that._options.monthNames[day.getMonth()]));
                        monthEl.appendChild(monthNameEl);
                        dayEl.appendChild(monthEl);

                        cls.push('has-month');
                    } 

                    if (day.getMonth() & 1) {
                        cls.push('month-even');
                    }

                    dayEl.setAttribute('data-date', dayTime);
                    dayEl.className = cls.join(' ');
                    ++counter;
                }
            }
        },

        _appendArrow: function (cls, node) {
            var el = document.createElement('div');

            el.className = 'expand-' + cls;
            el.appendChild(document.createElement('div'));
            node.appendChild(el);
        },

        _selectDates: function () {
            var that        = this,
                calendar    = that._calendarEl,
                weeks       = that._weeksData,
                firstDate   = weeks[0][0].getTime(),
                lastDate    = weeks[weeks.length - 1][6].getTime(),
                startDate   = that._startDate.getTime(),
                finishDate  = that._finishDate.getTime(),
                ONE_DAY     = that.ONE_DAY,
                weekEl, 
                dayEl, 
                currentSelectionDate, 
                finishSelectionDate, 
                startDateEl, 
                finishDateEl;

            that._removeSelection();

            if (finishDate + startDate <= ONE_DAY) {
                return false;
            }

            if (firstDate > finishDate) {
                return false;
            }

            if (lastDate < startDate) {
                return false;
            }

            startDateEl = calendar.querySelector('.week .day[data-date="' + startDate + '"]');
            if (!startDateEl) {
                startDateEl = calendar.querySelector('.week .day[data-date="' + firstDate + '"]');
            }

            finishDateEl = calendar.querySelector('.week .day[data-date="' + finishDate + '"]');
            if (!finishDateEl) {
                finishDateEl = calendar.querySelector('.week .day[data-date="' + lastDate + '"]');
            }

            if (startDateEl && finishDateEl) {
                currentSelectionDate = +startDateEl.getAttribute('data-date');
                finishSelectionDate = +finishDateEl.getAttribute('data-date');

                dayEl = startDateEl;
                weekEl = dayEl.parentNode;

                while (currentSelectionDate <= finishSelectionDate) {
                    dayEl.classList.add('selected');

                    dayEl = dayEl.nextSibling;
                    if (!dayEl) {
                        weekEl  = weekEl.nextSibling;
                        if (weekEl) {
                            dayEl = weekEl.querySelector('.day');
                        }
                    }

                    currentSelectionDate += ONE_DAY;
                }
            }

            return true;
        },

        _removeSelection: function () {
            var selectedDays = this._calendarEl.querySelectorAll('.week .day.selected'),
                i = 0,
                dayEl;

            for (; dayEl = selectedDays[i]; ++i) {
                dayEl.classList.remove('selected');
            }
        },


        /* "Drag date" behaviour */

        _onDragStart: function (node) {
            var that = this,
                date = +node.getAttribute('data-date');

            that._calendarEl.classList.add('dragging');
            that._dragStarted = true;
            that._dateDiff = that._finishDate.getTime() - date;

            document.addEventListener('selectstart', that._preventSelection, false);
        },

        _onDragEnd: function () {
            var that = this;

            that._calendarEl.classList.remove('dragging');
            that._dragStarted = false;

            document.removeEventListener('selectstart', that._preventSelection, false);
        },

        _onDrag: function (dayEl) {
            var that    = this,
                date    = +dayEl.getAttribute('data-date'),
                newDate = date ? new Date(date + that._dateDiff) : null;

            if (date && newDate && newDate.getTime() !== that._finishDate.getTime()) {
                that.setFinishDate(newDate, true);
            }
        },


        /* "Expand date" behaviour */

        _onExpandStart: function (node) {
            var that        = this,
                dayEl       = node.parentNode,
                isLeft      = ~node.className.indexOf('left'),
                date        = +dayEl.getAttribute('data-date'),
                startDate   = that._startDate.getTime(),
                finishDate  = that._finishDate.getTime();

            that._expandStarted = true;
            that._calendarEl.classList.add('expanding');

            if (startDate === finishDate) {
                that._expandFinishDate = !isLeft;
            } else {
                that._expandFinishDate = (date !== startDate);
            }

            document.addEventListener('selectstart', that._preventSelection, false);
        },

        _onExpandEnd: function () {
            var that = this;

            that._calendarEl.classList.remove('expanding');
            that._expandStarted = false;

            document.removeEventListener('selectstart', that._preventSelection, false);
        },

        _onExpand: function (dayEl) {
            var that        = this,
                date        = new Date(+dayEl.getAttribute('data-date')),
                finishDate  = that._finishDate,
                startDate   = that._startDate;

            if (!date.getTime()) {
                return;
            }

            if (!that._expandFinishDate && finishDate <= date) {
                that.setStartDate(new Date(finishDate));
                that._expandFinishDate = true;
            } else if (that._expandFinishDate && startDate >= date) {
                that.setFinishDate(new Date(new Date(startDate)));
                that._expandFinishDate = false;
            }

            if (that._expandFinishDate) {
                that.setFinishDate(date, false);
            } else {
                that.setStartDate(date);
            }
        },

        _onExpandToLeftClick: function (dayNode) {
            var that        = this,
                startDate   = that._startDate.getTime(),
                finishDate  = that._finishDate.getTime(),
                currentDate = +dayNode.getAttribute('data-date'),
                date        = new Date(currentDate - that.ONE_DAY);

            if (currentDate === finishDate && startDate !== finishDate) {
                that.setFinishDate(date, false);
            } else {
                that.setStartDate(date);
            }
        },

        _onExpandToRightClick: function (dayNode) {
            var that        = this,
                finishDate  = that._finishDate.getTime(),
                currentDate = +dayNode.getAttribute('data-date'),
                date        = new Date(currentDate + that.ONE_DAY);

            if (currentDate === finishDate) {
                that.setFinishDate(date, false);
            } else {
                that.setStartDate(date);
            }
        },


        /* Scroll processing */

        _onScroll: function () {
            var that            = this,
                y               = that._scrollerEl.scrollTop,
                listHeight      = that.listHeight,
                weekHeight      = that._options.weekRowHeight,
                weeksOffset     = that._getWeeksOffset(y),
                transform       = that._transformProperty,
                weeksToScroll   = 0,
                i               = 0,
                newTop;

            that._lastY = y;

            if (y === 0 || y === that._scrollHeight - listHeight) {
                that._preloadTimer && clearInterval(that._preloadTimer);
                that._preloadTimer = setTimeout(function () {
                    that._preloadWeeks();
                }, 500);
            }

            newTop = (y < listHeight)
                ? ((listHeight - y) % weekHeight) === 0 ? 0 : ((listHeight - y) % weekHeight) - weekHeight
                : ((y - listHeight) % weekHeight) === 0 ? 0 : -((y - listHeight) % weekHeight);

            if (weeksOffset !== that._currentIndex) {
                that._updateWeeks(weeksOffset - that._currentIndex);
                that._currentIndex = weeksOffset;
            }

            if (~transform.toLowerCase().indexOf('transform')) {
                that._calendarEl.style[transform] = 'translate3d(0, ' + newTop + 'px, 0)';
            } else {
                that._calendarEl.style[transform] = newTop + 'px';
            }

            var weeksData   = that._weeksData,
                firstYear   = weeksData[0][6].getFullYear(),
                lastYear    = weeksData[weeksData.length - 2][6].getFullYear();

            if (firstYear > that._year) {
                that.setYear(firstYear);
            }
            else if (lastYear < that._year ) {
                that.setYear(lastYear);
            }

            if (that._fixYearScroll) {
                that._fixYearScroll = false;

                if (weeksData[0][0].getFullYear() !== that._year && firstYear !== that._year) {
                    while (weeksData[i][0].getFullYear() !== that._year && weeksData[i][6].getFullYear() !== that._year && i < 3) {
                        ++weeksToScroll;
                        ++i;
                    }
                    that._scrollTo(that._lastY + weekHeight * weeksToScroll);
                } else {
                    that._updateCalendarHtml();
                }
            }
            else if (that._fixDateScroll) {
                var scrollDate = new Date(that._fixDateScroll);
                that._fixDateScroll = false;

                if (weeksData[0][0] <= scrollDate && weeksData[0][6] >= scrollDate) {
                    that._scrollTo(that._lastY - weekHeight);
                } else {
                    that._updateCalendarHtml();
                }
            }
        },

        _scrollTo: function (y) {
            this._scrollerEl.scrollTop = y;
            this._lastY = y;
        },

        _setScrollHeight: function (heigth) {
            var that = this;

            that._scrollHeight = heigth;
            that._scrollerEl.querySelector('div').style.height = heigth + 'px';
        },

        _getWeeksOffset: function (y) {
            var that        = this,
                initialY    = that.listHeight * that._loadedBefore,
                weeksCount  = Math.abs(initialY - y) / that._options.weekRowHeight;

            return (y < initialY)
                ? -Math.ceil(weeksCount)
                : (y > initialY)
                    ? Math.floor(weeksCount)
                    : 0;
        },

        _preloadWeeks: function () {
            var that            = this,
                listHeight      = that.listHeight,
                scrollHeight    = that._scrollHeight,
                y               = that._lastY;

            if (y === 0 || y === scrollHeight - listHeight) {
                that._setScrollHeight(scrollHeight + listHeight);

                if (y === 0) {
                    y = listHeight;
                    that._minDate = new Date(that._minDate.getTime() - that.ONE_DAY * 10 * 7);
                    ++that._loadedBefore;
                } else {
                    that._maxDate = new Date(that._maxDate.getTime() + that.ONE_DAY * 9 * 7);
                }

                that._scrollTo(y);
            }
        },

        /* Create HTML nodes */

        _createHeaderEl: function () {
            var that    = this,
                header  = document.createElement('div'),
                day     = that._options.firstWeekDay,
                dayNames = that._options.dayNames,
                el      = document.createDocumentFragment(),
                i       = 0,
                dayElement;

            header.className = 'day-names';

            for (; i < 7; ++i) {
                dayElement = document.createElement('div');
                dayElement.className = 'day-name';
                dayElement.appendChild(document.createTextNode(dayNames[day % 7]));
                el.appendChild(dayElement);
                day++;
            }

            header.appendChild(el);

            return header;
        },

        _createScrollerEl: function () {
            var element = document.createElement('div'),
                innerEl = document.createElement('div'),
                height  = (this._options.weeksToDisplay - 1) * this._options.weekRowHeight,
                width   = this._options.weekRowHeight * 7 + this._getScrollbarWidth();

            element.className = 'scroller';
            element.appendChild(innerEl);

            element.style.height    = height + 'px';
            element.style.width     = width + 'px';
            innerEl.style.height    = 3 * height + 'px';

            return element;
        },

        _createCalendarEl: function () {
            var element = document.createElement('div');
            element.className = 'dates';

            return element;
        },

        _createYearEl: function () {
            var element = document.createElement('div');
            element.className = 'year';

            return element;
        },


        /* Some helper methods */

        _preventSelection: function (e) {
            e.preventDefault();
        },

        _removeAllChild: function (el) {
            while (el.firstChild) {
                el.removeChild(el.firstChild);
            }
        },

        _getScrollbarWidth: function () {
            var outer = document.createElement("div");
            outer.style.visibility = "hidden";
            outer.style.width = "100px";
            document.body.appendChild(outer);

            var widthNoScroll = outer.offsetWidth;
            // force scrollbars
            outer.style.overflow = "scroll";

            // add innerdiv
            var inner = document.createElement("div");
            inner.style.width = "100%";
            outer.appendChild(inner);        

            var widthWithScroll = inner.offsetWidth;

            // remove divs
            outer.parentNode.removeChild(outer);

            return widthNoScroll - widthWithScroll;
        },

        _getOptions: function (userOptions) {
            var options = JSON.parse(JSON.stringify(this._defaultOptions));

            for (var key in userOptions) if (userOptions.hasOwnProperty(key)) {
                options[key] = userOptions[key];
            }

            return options;
        },

        _getTransformProperty: function () {
            var style = this._containerEl.style;

            return (typeof style['transform'] !== 'undefined')
                ? 'transform'
                : (typeof style['webkitTransform'] !== 'undefined')
                    ? 'webkitTransform'
                    : (typeof style['MozTransform'] !== 'undefined')
                        ? 'MozTransform'
                        : 'top';
        }

    };

    return Calendar;
}());