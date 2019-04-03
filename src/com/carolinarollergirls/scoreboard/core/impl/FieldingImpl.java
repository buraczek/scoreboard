package com.carolinarollergirls.scoreboard.core.impl;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import com.carolinarollergirls.scoreboard.core.BoxTrip;
import com.carolinarollergirls.scoreboard.core.Fielding;
import com.carolinarollergirls.scoreboard.core.FloorPosition;
import com.carolinarollergirls.scoreboard.core.Position;
import com.carolinarollergirls.scoreboard.core.Role;
import com.carolinarollergirls.scoreboard.core.Skater;
import com.carolinarollergirls.scoreboard.core.Team;
import com.carolinarollergirls.scoreboard.core.TeamJam;
import com.carolinarollergirls.scoreboard.event.ParentOrderedScoreBoardEventProviderImpl;
import com.carolinarollergirls.scoreboard.event.ScoreBoardEvent.AddRemoveProperty;
import com.carolinarollergirls.scoreboard.event.ScoreBoardEvent.CommandProperty;
import com.carolinarollergirls.scoreboard.event.ScoreBoardEvent.PermanentProperty;
import com.carolinarollergirls.scoreboard.event.ScoreBoardEvent.ValueWithId;

public class FieldingImpl extends ParentOrderedScoreBoardEventProviderImpl<Fielding> implements Fielding {
    public FieldingImpl(TeamJam teamJam, Position position) {
        super(teamJam, position.getProviderId(), TeamJam.Child.FIELDING, Fielding.class, Value.class, Child.class, Command.class);
        this.teamJam = teamJam;
        set(Value.POSITION, position);
        addWriteProtection(Value.POSITION);
        setRecalculated(Value.SKATER_NUMBER).addIndirectSource(this, Value.SKATER, Skater.Value.NUMBER).addSource(this, Value.NOT_FIELDED);
        setInverseReference(Child.BOX_TRIP, BoxTrip.Child.FIELDING);
        setInverseReference(Value.SKATER, Skater.Child.FIELDING);
        setRecalculated(Value.NOT_FIELDED).addSource(this, Value.SKATER);
    }

    public String getProviderId() { return getPosition().getProviderId(); }

    protected Object computeValue(PermanentProperty prop, Object value, Object last, Flag flag) {
        if (prop == Value.PENALTY_BOX && flag != Flag.FROM_AUTOSAVE) {
            if ((Boolean)value && (getCurrentBoxTrip() == null || !getCurrentBoxTrip().isCurrent())) {
                if (getSkater() == null) {
                    return false;
                } else {
                    getTeamJam().getTeam().add(Team.Child.BOX_TRIP, new BoxTripImpl(this));
                }
            } else if (!(Boolean)value && getCurrentBoxTrip() != null && getCurrentBoxTrip().isCurrent()) {
                getCurrentBoxTrip().end();
            }
        }
        if (prop == Value.NOT_FIELDED && getSkater() != null) { return false; }
        if (prop == Value.SKATER_NUMBER) {
            if (getSkater() != null) {
                return getSkater().getNumber();
            } else if ((Boolean)get(Value.NOT_FIELDED)) {
                return "n/a";
            } else {
                return "?";
            }
        }
        return value;
    }
    protected void valueChanged(PermanentProperty prop, Object value, Object last, Flag flag) {
        if (prop == Value.PENALTY_BOX && isCurrent() && (Boolean)value &&
                getPosition().getFloorPosition() == FloorPosition.JAMMER &&
                scoreBoard.isInJam() && !teamJam.getOtherTeam().isLead()) {
            teamJam.set(TeamJam.Value.LOST, true);
        }
        if (prop == Value.CURRENT_BOX_TRIP) {
            set(Value.PENALTY_BOX, value != null && ((BoxTrip)value).isCurrent());
            updateBoxTripSymbols();
        }
        if (prop == Value.SIT_FOR_3) {
            updateBoxTripSymbols();
            if (getSkater() != null) {
                getSkater().updateEligibility();
            }
        }
    }

    protected void itemAdded(AddRemoveProperty prop, ValueWithId item) {
        if (prop == Child.BOX_TRIP && ((BoxTrip)item).isCurrent()) {
            set(Value.CURRENT_BOX_TRIP, item);
        }
    }
    protected void itemRemoved(AddRemoveProperty prop, ValueWithId item) {
        if (prop == Child.BOX_TRIP && item == getCurrentBoxTrip()) {
            set(Value.CURRENT_BOX_TRIP, null);
        }
    }
    
    public void execute(CommandProperty prop) {
        if (prop == Command.ADD_BOX_TRIP && getSkater() != null) {
            BoxTrip bt = new BoxTripImpl(this);
            if (!isCurrent()) {
                bt.end();
            }
            add(Child.BOX_TRIP, bt);
        }
    }

    public TeamJam getTeamJam() { return teamJam; }
    public Position getPosition() { return (Position)get(Value.POSITION); }

    public boolean isCurrent() { return teamJam.isRunningOrUpcoming(); }

    public Role getCurrentRole() { return getPosition().getFloorPosition().getRole(teamJam); }

    public Skater getSkater() { return (Skater)get(Value.SKATER); }
    public void setSkater(Skater s) { set(Value.SKATER, s); }

    public boolean isSitFor3() { return (Boolean)get(Value.SIT_FOR_3); }
    public boolean isInBox() { return (Boolean)get(Value.PENALTY_BOX); }
    public BoxTrip getCurrentBoxTrip() { return (BoxTrip)get(Value.CURRENT_BOX_TRIP); }
    public void updateBoxTripSymbols() {
        List<BoxTrip> trips = new ArrayList<BoxTrip>();
        for (ValueWithId v : getAll(Child.BOX_TRIP)) {
            trips.add((BoxTrip) v);
        }
        Collections.sort(trips);
        StringBuilder beforeSP = new StringBuilder();
        StringBuilder afterSP = new StringBuilder();
        StringBuilder jam = new StringBuilder();
        //TODO: make symbols configurable in the ruleset
        //Key:  1 = started earlier and ended later
        //      2 = started during this, ended later
        //      3 = started with this, ended later
        //      4 = ended during this, started earlier
        //      5 = started and ended during this
        //      6 = started with and ended during this
        String[] symbols = "S,-,S,$,+,$".split(",");
        //2015-18 symbols: "|,/,S,X,X,$"
        //pre-2015 symbols:"S,/,S,$,X,$"
        for (BoxTrip trip : trips) {
            int typeBeforeSP = 1;
            int typeAfterSP = 1;
            int typeJam = 1;
            if (this == trip.getStartFielding()) {
                if (trip.startedBetweenJams()) {
                    typeJam = 3;
                    typeBeforeSP = 3;
                } else if (trip.startedAfterSP()) {
                    typeJam = 2;
                    typeBeforeSP = 0;
                    typeAfterSP = 2;
                } else {
                    typeJam = 2;
                    typeBeforeSP = 2;
                }
            }
            if (this == trip.getEndFielding()) {
                if (trip.isCurrent() || trip.endedBetweenJams()) {
                    typeJam = 0;
                    typeBeforeSP = 0;
                    typeAfterSP = 0;
                } else if (trip.endedAfterSP()) {
                    typeJam += 3;
                    typeAfterSP += 3;
                } else {
                    typeJam += 3;
                    typeBeforeSP += 3;
                    typeAfterSP = 0;
                }
            }
            if (typeBeforeSP > 0) { beforeSP.append(" " + symbols[typeBeforeSP - 1]); }
            if (typeAfterSP > 0) { afterSP.append(" " + symbols[typeAfterSP - 1]); }
            if (typeJam > 0) { jam.append(" " + symbols[typeJam - 1]); }
        }
        if (isSitFor3()) {
            jam.append(" 3");
            if(getTeamJam().isStarPass()) {
                afterSP.append(" 3");
            } else {
                beforeSP.append(" 3");
            }
        }
        set(Value.BOX_TRIP_SYMBOLS_BEFORE_S_P, beforeSP.toString());
        set(Value.BOX_TRIP_SYMBOLS_AFTER_S_P, afterSP.toString());
        set(Value.BOX_TRIP_SYMBOLS, jam.toString());
    }

    private TeamJam teamJam;
}
