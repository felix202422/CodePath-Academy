package com.codepath.academy.assessment.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

/** Join row linking one answer to the option(s) the student selected. */
@Entity
@Table(name = "assessment_answer_option")
@IdClass(AssessmentAnswerOption.Key.class)
public class AssessmentAnswerOption {

    @Id
    @Column(name = "answer_id", nullable = false)
    private UUID answerId;

    @Id
    @Column(name = "option_id", nullable = false)
    private UUID optionId;

    public AssessmentAnswerOption() {
    }

    public AssessmentAnswerOption(UUID answerId, UUID optionId) {
        this.answerId = answerId;
        this.optionId = optionId;
    }

    public UUID getAnswerId() {
        return answerId;
    }

    public UUID getOptionId() {
        return optionId;
    }

    /** Composite primary key ({@code answer_id}, {@code option_id}). */
    public static class Key implements Serializable {

        private UUID answerId;
        private UUID optionId;

        public Key() {
        }

        public Key(UUID answerId, UUID optionId) {
            this.answerId = answerId;
            this.optionId = optionId;
        }

        public UUID getAnswerId() {
            return answerId;
        }

        public void setAnswerId(UUID answerId) {
            this.answerId = answerId;
        }

        public UUID getOptionId() {
            return optionId;
        }

        public void setOptionId(UUID optionId) {
            this.optionId = optionId;
        }

        @Override
        public boolean equals(Object other) {
            if (this == other) {
                return true;
            }
            if (!(other instanceof Key key)) {
                return false;
            }
            return Objects.equals(answerId, key.answerId) && Objects.equals(optionId, key.optionId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(answerId, optionId);
        }
    }
}
